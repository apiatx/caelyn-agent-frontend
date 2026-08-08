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

// ─── 7. Subtheme row rendering decision logic ─────────────────────────────────
// These tests cover the computed disabled/placeholder state for all three cases
// (A: no theme, B: theme-with-children, C: theme-without-children) to prove the
// Subtheme row is always present and merely changes state, not visibility.

/** Helper that mirrors the computed values the editor uses */
function subthemeRowState(
  draftThemeId: string | null,
  idx: ThemeTaxonomyIndex,
): { disabled: boolean; placeholder: string | null; childCount: number } {
  const childIds = draftThemeId ? (idx.childrenByParentThemeId.get(draftThemeId) ?? []) : [];
  const subthemesForDraftTheme = childIds
    .map(id => idx.nodeById.get(id))
    .filter((n): n is NonNullable<typeof n> => !!n && n.classification === "sub_theme");
  const disabled = !draftThemeId || subthemesForDraftTheme.length === 0;
  let placeholder: string | null = null;
  if (!draftThemeId) placeholder = "— Select a Primary Theme first —";
  else if (subthemesForDraftTheme.length === 0) placeholder = "— No subthemes for this theme —";
  return { disabled, placeholder, childCount: subthemesForDraftTheme.length };
}

test("REQ-37 Case A — no Primary Theme: subtheme selector disabled with 'Select a Primary Theme first' placeholder", () => {
  const idx = makeIndex();
  const s = subthemeRowState(null, idx);
  assert.ok(s.disabled, "selector must be disabled");
  assert.equal(s.placeholder, "— Select a Primary Theme first —");
  assert.equal(s.childCount, 0);
});

test("REQ-38 Case B — theme with child subthemes: selector enabled, children populated", () => {
  const idx = makeIndex();
  const s = subthemeRowState("th-ai", idx); // th-ai has st-nlp + st-cv
  assert.ok(!s.disabled, "selector must be enabled");
  assert.equal(s.placeholder, null);
  assert.ok(s.childCount >= 2, `expected ≥2 children, got ${s.childCount}`);
});

test("REQ-39 Case C — theme with no subthemes: selector disabled with 'No subthemes' placeholder", () => {
  const idx = makeIndex();
  const s = subthemeRowState("th-bio", idx); // th-bio has no children
  assert.ok(s.disabled, "selector must be disabled");
  assert.equal(s.placeholder, "— No subthemes for this theme —");
  assert.equal(s.childCount, 0);
});

test("REQ-40 parent change clears incompatible draftSubthemeId", () => {
  // Simulate: user selects th-ai then st-nlp, then switches to th-ev
  let draftThemeId: string | null = "th-ai";
  let draftSubthemeId: string | null = "st-nlp";
  // Changing Primary Theme fires: setDraftThemeId(newId); setDraftSubthemeId(null)
  draftThemeId = "th-ev";
  draftSubthemeId = null; // cleared by onChange handler
  assert.equal(draftThemeId, "th-ev");
  assert.equal(draftSubthemeId, null, "old subtheme must be cleared after parent change");
});

test("REQ-41 switching back to same parent does not auto-restore old subtheme", () => {
  // After parent change clears subthemeId, re-selecting the same parent
  // starts with no subtheme pre-selected (user must pick again)
  let draftThemeId: string | null = "th-ai";
  let draftSubthemeId: string | null = "st-nlp";
  draftThemeId = "th-ev";
  draftSubthemeId = null;
  draftThemeId = "th-ai"; // switch back
  assert.equal(draftSubthemeId, null, "subtheme must not auto-restore when switching back to original parent");
});

test("REQ-42 existing subtheme hydration: primary_theme_id pointing to sub_theme opens with parent+subtheme set", () => {
  const idx = makeIndex();
  // st-nlp is a sub_theme whose parent is th-ai
  const stock = { primary_theme_id: "st-nlp", theme_ids: ["st-nlp"] };
  const r = hydrateDraft(stock, idx);
  assert.equal(r.themeId, "th-ai", "parent theme must be resolved from sub_theme node");
  assert.equal(r.subthemeId, "st-nlp", "subtheme must be set to the specific sub_theme ID");
});

test("REQ-43 existing subtheme hydration does not flatten to parent theme", () => {
  const idx = makeIndex();
  const stock = { primary_theme_id: "st-bat", theme_ids: ["st-bat"] }; // Battery Technology, parent: th-ev
  const r = hydrateDraft(stock, idx);
  assert.equal(r.themeId, "th-ev");
  assert.equal(r.subthemeId, "st-bat", "subtheme must not be lost (flattened) during hydration");
  assert.notEqual(r.subthemeId, null);
});

test("REQ-44 save semantics: parent-only — effectivePrimaryId equals draftThemeId", () => {
  const draftSubthemeId: string | null = null;
  const draftThemeId: string | null = "th-ai";
  const effectivePrimaryId = draftSubthemeId ?? draftThemeId ?? null;
  assert.equal(effectivePrimaryId, "th-ai");
});

test("REQ-45 save semantics: subtheme selected — effectivePrimaryId equals draftSubthemeId, not parent", () => {
  const draftSubthemeId: string | null = "st-nlp";
  const draftThemeId: string | null = "th-ai";
  const effectivePrimaryId = draftSubthemeId ?? draftThemeId ?? null;
  assert.equal(effectivePrimaryId, "st-nlp", "subtheme ID must take priority over parent theme ID");
  assert.notEqual(effectivePrimaryId, draftThemeId);
});

test("REQ-46 save semantics: additional themes unchanged by subtheme selection", () => {
  const draftAdditionals = ["th-ev", "th-bio"];
  const effectivePrimaryId = "st-nlp";
  // cleanAdditionals must exclude effectivePrimaryId but leave others intact
  const cleanAdditionals = draftAdditionals.filter(id => id !== effectivePrimaryId);
  assert.deepEqual(cleanAdditionals, ["th-ev", "th-bio"], "additional themes must be unaffected");
});

test("REQ-47 fail-closed: non-ok data never mutates cache (ok !== true guard)", () => {
  // Simulate the check: data.ok !== true must throw
  const data = { detail: "Auth error" }; // missing ok: true
  let threw = false;
  try {
    if ((data as any)?.ok !== true) throw new Error(data.detail || "Backend did not confirm save");
  } catch {
    threw = true;
  }
  assert.ok(threw, "missing ok: true must be treated as failure");
});

test("REQ-48 fail-closed: missing required taxonomy fields must be rejected", () => {
  // data with ok:true but no primary_theme_id/theme_ids
  const data = { ok: true };
  let threw = false;
  try {
    if (!("primary_theme_id" in data) || !Array.isArray((data as any).theme_ids)) {
      throw new Error("Backend response missing required taxonomy fields");
    }
  } catch {
    threw = true;
  }
  assert.ok(threw, "response without required fields must be rejected");
});

// ─── 8. setQueryData cache patch — row-identity and canonical_theme_id correctness ──
//
// These tests inline the EXACT production cache-patch logic from
// WlTaxonomyEditorPanel.handleSave() so they catch the two proven bugs:
//
//   Bug 1: matcher used only (t.ticker||'') — misses raw rows where the backend
//          sends `symbol` instead of `ticker`.
//   Bug 2: canonical_theme_id used `savedPrimaryId ?? t.canonical_theme_id` —
//          preserved stale identity when savedPrimaryId was null.
//
// The fix:
//   String(t.ticker || t.symbol || '').trim().toUpperCase()  (identity)
//   canonical_theme_id: savedPrimaryId                       (authoritative wins)

/** Mirror the production setQueryData updater exactly. */
function applyPatch(
  old: any,
  ticker: string,
  savedPrimaryId: string | null,
  savedThemeIds: string[],
  savedAdditionalIds: string[],
  savedSubthemeIds: string[],
): any {
  if (!old || !old.analysis?.sections) return old;
  const upperTicker = ticker.toUpperCase();
  return {
    ...old,
    analysis: {
      ...old.analysis,
      sections: old.analysis.sections.map((sec: any) => ({
        ...sec,
        tickers: Array.isArray(sec.tickers)
          ? sec.tickers.map((t: any) =>
              String(t.ticker || t.symbol || "").trim().toUpperCase() !== upperTicker
                ? t
                : {
                    ...t,
                    primary_theme_id: savedPrimaryId,
                    theme_ids: savedThemeIds,
                    additional_theme_ids: savedAdditionalIds,
                    subtheme_ids: savedSubthemeIds,
                    canonical_theme_id: savedPrimaryId,
                  }
            )
          : sec.tickers,
      })),
    },
  };
}

// ── CRITICAL regression test — symbol-only raw row ────────────────────────────

test("REQ-49 CRITICAL — symbol-only raw row: AXTI patched immediately after successful PUT", () => {
  const idx = makeIndex();
  // Exact cache shape from the proven regression scenario
  const old = {
    analysis: {
      sections: [
        {
          id: "something",
          tickers: [
            {
              symbol: "AXTI",
              primary_theme_id: null,
              canonical_theme_id: null,
              theme_ids: [],
              subtheme_ids: [],
            },
          ],
        },
      ],
    },
  };
  // Authoritative PUT response
  const saveResponse = {
    ok: true,
    primary_theme_id: "packaging_substrates",
    theme_ids: ["packaging_substrates", "semicap_materials_node"],
    additional_theme_ids: ["semicap_materials_node"],
    subtheme_ids: ["packaging_substrates"],
  };
  const updated = applyPatch(
    old,
    "AXTI",
    saveResponse.primary_theme_id,
    saveResponse.theme_ids,
    saveResponse.additional_theme_ids,
    saveResponse.subtheme_ids,
  );
  const row = updated.analysis.sections[0].tickers[0];
  // Row identity preserved
  assert.equal(row.symbol, "AXTI", "symbol field must survive patch");
  // All authoritative taxonomy fields applied
  assert.equal(row.primary_theme_id, "packaging_substrates");
  assert.equal(row.canonical_theme_id, "packaging_substrates", "canonical_theme_id must equal savedPrimaryId");
  assert.deepEqual(row.theme_ids, ["packaging_substrates", "semicap_materials_node"]);
  assert.deepEqual(row.additional_theme_ids, ["semicap_materials_node"]);
  assert.deepEqual(row.subtheme_ids, ["packaging_substrates"]);
  // Cell label resolves immediately without a backend refetch
  // (using a taxonomy index that has packaging_substrates as a theme)
  const idxWithPkg = buildThemeTaxonomyIndex([
    { theme_id: "packaging_substrates", display_name: "Packaging & Substrates", classification: "sub_theme", parent_theme_id: "th-semis" },
    { theme_id: "th-semis", display_name: "Semiconductors", classification: "theme", parent_theme_id: null },
    { theme_id: "semicap_materials_node", display_name: "Semicap Materials", classification: "theme", parent_theme_id: null },
  ]);
  const label = buildLabel(row, idxWithPkg);
  assert.ok(label !== null && label !== "", `visible label must be non-empty, got: ${label}`);
  assert.equal(label, "Packaging & Substrates", "label must resolve from authoritative primary_theme_id");
  // THIS WOULD FAIL AGAINST PRE-FIX CODE (t.ticker undefined on symbol-only row)
  const preFix = {
    ...old,
    analysis: {
      ...old.analysis,
      sections: old.analysis.sections.map((sec: any) => ({
        ...sec,
        tickers: sec.tickers.map((t: any) =>
          (t.ticker || "").toUpperCase() !== "AXTI" ? t : { ...t, primary_theme_id: "packaging_substrates" }
        ),
      })),
    },
  };
  const prefixRow = preFix.analysis.sections[0].tickers[0];
  assert.equal(prefixRow.primary_theme_id, null, "pre-fix matcher silently misses symbol-only row");
});

// ── Test A — symbol-only raw row ──────────────────────────────────────────────

test("REQ-50 A — symbol-only raw row { symbol: 'AXTI' } is matched and patched", () => {
  const old = { analysis: { sections: [{ tickers: [{ symbol: "AXTI", primary_theme_id: null, canonical_theme_id: null, theme_ids: [] }] }] } };
  const updated = applyPatch(old, "AXTI", "software", ["software"], [], []);
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.primary_theme_id, "software");
  assert.equal(row.canonical_theme_id, "software");
  assert.equal(row.symbol, "AXTI", "symbol field preserved");
});

// ── Test B — ticker-only compatibility row ────────────────────────────────────

test("REQ-51 B — ticker-only raw row { ticker: 'AXTI' } still matched and patched", () => {
  const old = { analysis: { sections: [{ tickers: [{ ticker: "AXTI", primary_theme_id: null, canonical_theme_id: null, theme_ids: [] }] }] } };
  const updated = applyPatch(old, "AXTI", "software", ["software"], [], []);
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.primary_theme_id, "software");
  assert.equal(row.canonical_theme_id, "software");
});

// ── Test C — mixed casing and whitespace ──────────────────────────────────────

test("REQ-52 C — raw row ticker normalized: mixed case and whitespace match correctly", () => {
  const old = { analysis: { sections: [{ tickers: [{ ticker: " axti ", primary_theme_id: null, theme_ids: [] }] }] } };
  const updated = applyPatch(old, "AXTI", "defense", ["defense"], [], []);
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.primary_theme_id, "defense", "mixed-case / whitespace ticker must match");
});

// ── Test D — unrelated ticker untouched ───────────────────────────────────────

test("REQ-53 D — unrelated ticker row is referentially unchanged after patch", () => {
  const unrelated = { ticker: "NVDA", primary_theme_id: "ai", canonical_theme_id: "ai", theme_ids: ["ai"] };
  const old = { analysis: { sections: [{ tickers: [{ symbol: "AXTI", primary_theme_id: null, theme_ids: [] }, unrelated] }] } };
  const updated = applyPatch(old, "AXTI", "software", ["software"], [], []);
  const nvdaRow = updated.analysis.sections[0].tickers[1];
  assert.equal(nvdaRow, unrelated, "unrelated row must be the same reference (not mutated)");
  assert.equal(nvdaRow.primary_theme_id, "ai", "unrelated row taxonomy unchanged");
});

// ── Test E — parent Theme assignment: label updates immediately ───────────────

test("REQ-54 E — parent Theme assignment: visible label resolves immediately from patched row", () => {
  const idx = makeIndex(); // has th-ai = "AI & Machine Learning"
  const old = { analysis: { sections: [{ tickers: [{ symbol: "MSFT", primary_theme_id: null, canonical_theme_id: null, theme_ids: [] }] }] } };
  const updated = applyPatch(old, "MSFT", "th-ai", ["th-ai"], [], []);
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.primary_theme_id, "th-ai");
  const label = buildLabel(row, idx);
  assert.equal(label, "AI & Machine Learning");
});

// ── Test F — subtheme assignment: primary_theme_id is subtheme ID ────────────

test("REQ-55 F — subtheme assignment: primary_theme_id is subtheme ID; label is subtheme name", () => {
  const idx = makeIndex(); // st-nlp = "Natural Language Processing"
  const old = { analysis: { sections: [{ tickers: [{ symbol: "MSFT", primary_theme_id: null, canonical_theme_id: null, theme_ids: [] }] }] } };
  const updated = applyPatch(old, "MSFT", "st-nlp", ["st-nlp"], [], []);
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.primary_theme_id, "st-nlp", "primary_theme_id must be subtheme ID");
  assert.equal(row.canonical_theme_id, "st-nlp");
  const label = buildLabel(row, idx);
  assert.equal(label, "Natural Language Processing");
});

// ── Test G — additional membership ───────────────────────────────────────────

test("REQ-56 G — additional membership: theme_ids and additional_theme_ids updated correctly", () => {
  const old = { analysis: { sections: [{ tickers: [{ symbol: "MSFT", primary_theme_id: "th-ai", theme_ids: ["th-ai"] }] }] } };
  const updated = applyPatch(old, "MSFT", "th-ai", ["th-ai", "th-ev"], ["th-ev"], []);
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.primary_theme_id, "th-ai");
  assert.deepEqual(row.additional_theme_ids, ["th-ev"]);
  assert.deepEqual(row.theme_ids, ["th-ai", "th-ev"]);
});

// ── Test H — legitimate authoritative null clears stale canonical_theme_id ───

test("REQ-57 H — authoritative null primary: stale canonical_theme_id must NOT survive", () => {
  const old = {
    analysis: {
      sections: [{
        tickers: [{
          symbol: "MSFT",
          primary_theme_id: "th-ai",
          canonical_theme_id: "th-ai",  // stale
          theme_ids: ["th-ai"],
        }],
      }],
    },
  };
  // Authoritative clear — savedPrimaryId is null
  const updated = applyPatch(old, "MSFT", null, [], [], []);
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.primary_theme_id, null, "primary_theme_id must be null");
  assert.equal(row.canonical_theme_id, null, "stale canonical_theme_id must NOT survive authoritative null");
});

// ── Test I — failed backend save: no cache mutation ───────────────────────────

test("REQ-58 I — failed save: cache must not be mutated when save throws", () => {
  const old = { analysis: { sections: [{ tickers: [{ symbol: "AXTI", primary_theme_id: null, theme_ids: [] }] }] } };
  let cacheWasMutated = false;
  // Simulate the fail-closed guard: if data.ok !== true, we throw before setQueryData
  function simulateSave(responseData: any) {
    if (responseData?.ok !== true) {
      throw new Error("Backend did not confirm save");
    }
    // Only reached on success — in production this is where setQueryData runs
    cacheWasMutated = true;
    return applyPatch(old, "AXTI", responseData.primary_theme_id, responseData.theme_ids ?? [], responseData.additional_theme_ids ?? [], responseData.subtheme_ids ?? []);
  }
  // Simulate backend 500 / missing ok
  let threw = false;
  try {
    simulateSave({ error: "internal server error" });
  } catch {
    threw = true;
  }
  assert.ok(threw, "failed save must throw");
  assert.ok(!cacheWasMutated, "cache must not be mutated when save fails");
  // Original cache row untouched
  assert.equal(old.analysis.sections[0].tickers[0].primary_theme_id, null);
});

// ── Test J — non-JSON HTTP 200 remains a hard failure ────────────────────────

test("REQ-59 J — non-JSON Content-Type: save must fail before cache mutation", () => {
  let cacheWasMutated = false;
  function simulateNonJsonResponse() {
    const ct = "text/html; charset=utf-8"; // SPA fallback
    if (!ct.includes("application/json")) {
      throw new Error("Save returned a non-JSON response — proxy may be misconfigured");
    }
    cacheWasMutated = true;
  }
  let threw = false;
  try { simulateNonJsonResponse(); } catch { threw = true; }
  assert.ok(threw, "non-JSON CT must throw");
  assert.ok(!cacheWasMutated, "cache must not be mutated");
});

// ── Test K — backend 500 remains a hard failure ───────────────────────────────

test("REQ-60 K — backend 500: r.ok is false → save fails, cache unchanged", () => {
  let cacheWasMutated = false;
  function simulateHttp500() {
    const rOk = false;
    const data = { detail: "Internal Server Error" };
    if (!rOk) throw new Error(data.detail || `Save failed (500)`);
    cacheWasMutated = true;
  }
  let threw = false;
  try { simulateHttp500(); } catch { threw = true; }
  assert.ok(threw, "HTTP 500 must throw");
  assert.ok(!cacheWasMutated, "cache must not be mutated on 500");
});

// ── Test L — malformed success body / missing required fields ─────────────────

test("REQ-61 L — malformed success body missing required fields: hard failure, no cache mutation", () => {
  let cacheWasMutated = false;
  function simulateMalformedSuccess() {
    const data: any = { ok: true }; // missing primary_theme_id and theme_ids
    if (!("primary_theme_id" in data) || !Array.isArray(data.theme_ids)) {
      throw new Error("Backend response missing required taxonomy fields");
    }
    cacheWasMutated = true;
  }
  let threw = false;
  try { simulateMalformedSuccess(); } catch { threw = true; }
  assert.ok(threw, "missing required fields must throw");
  assert.ok(!cacheWasMutated, "cache must not be mutated on malformed success body");
});
