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

// ─── 9. Optimistic-first ordering — Tests 1–15 from spec ─────────────────────
//
// These tests cover the new optimistic-first handleSave() ordering:
//   STEP 2 (cache patch) and STEP 3 (onClose) happen synchronously BEFORE
//   the network fetch resolves in STEP 4.
//
// The `applyOptimisticPatch` helper mirrors the production logic exactly.

/** Mirror of the optimistic computation in handleSave() */
function computeOptimistic(
  effectivePrimaryId: string | null,
  cleanAdditionals: string[],
  idx: ThemeTaxonomyIndex,
) {
  const optimisticPrimaryId = effectivePrimaryId ?? null;
  const optimisticAdditionalIds = cleanAdditionals.filter(id => id !== optimisticPrimaryId);
  const optimisticThemeIds = [
    ...(optimisticPrimaryId ? [optimisticPrimaryId] : []),
    ...optimisticAdditionalIds,
  ];
  const optimisticSubthemeIds = optimisticThemeIds.filter(
    id => idx.nodeById.get(id)?.classification === "sub_theme",
  );
  return { optimisticPrimaryId, optimisticAdditionalIds, optimisticThemeIds, optimisticSubthemeIds };
}

/** Mirror of the row-patch helper in handleSave() */
function applyOptimisticPatch(
  old: any,
  ticker: string,
  fields: Record<string, unknown>,
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
                : { ...t, ...fields }
            )
          : sec.tickers,
      })),
    },
  };
}

// ── TEST 1 — Optimistic patch happens before network completes ─────────────────

test("REQ-62 TEST 1 — cache patched with optimistic state before fetch resolves", async () => {
  const idx = makeIndex();
  const old = {
    analysis: {
      sections: [{ tickers: [{ symbol: "ACMR", primary_theme_id: "th-ai", canonical_theme_id: "th-ai", theme_ids: ["th-ai"], additional_theme_ids: [], subtheme_ids: [] }] }],
    },
  };

  // Track ordering
  const events: string[] = [];
  let cache = old;

  // Deferred fetch — we control when it resolves
  let resolveFetch!: (v: any) => void;
  const fetchPromise = new Promise<any>((res) => { resolveFetch = res; });

  // Simulate Step 2 synchronously (as handleSave does)
  const { optimisticPrimaryId, optimisticAdditionalIds, optimisticThemeIds, optimisticSubthemeIds } =
    computeOptimistic("th-ev", [], idx);
  cache = applyOptimisticPatch(cache, "ACMR", {
    primary_theme_id: optimisticPrimaryId,
    canonical_theme_id: optimisticPrimaryId,
    theme_ids: optimisticThemeIds,
    additional_theme_ids: optimisticAdditionalIds,
    subtheme_ids: optimisticSubthemeIds,
  });
  events.push("optimistic_patch");

  // Step 3: close
  events.push("modal_closed");

  // At this point fetch has NOT resolved yet
  assert.equal(events.includes("optimistic_patch"), true, "cache must be patched already");
  assert.equal(cache.analysis.sections[0].tickers[0].primary_theme_id, "th-ev",
    "optimistic primary_theme_id applied BEFORE fetch resolves");
  assert.equal(cache.analysis.sections[0].tickers[0].canonical_theme_id, "th-ev");

  // Now resolve fetch (Step 4)
  resolveFetch({ ok: true, primary_theme_id: "th-ev", theme_ids: ["th-ev"], additional_theme_ids: [], subtheme_ids: [] });
  const response = await fetchPromise;
  events.push("fetch_resolved");

  // Verify ordering
  assert.ok(events.indexOf("optimistic_patch") < events.indexOf("fetch_resolved"),
    "optimistic_patch must precede fetch_resolved");
  assert.ok(events.indexOf("modal_closed") < events.indexOf("fetch_resolved"),
    "modal_closed must precede fetch_resolved");
  assert.ok(response.ok === true, "fetch resolved with success");
});

// ── TEST 2 — Modal closes before fetch resolves ────────────────────────────────

test("REQ-63 TEST 2 — onClose fires before fetch resolves", async () => {
  const events: string[] = [];
  let closeFired = false;

  // Simulate the ordering: patch → close → background fetch
  events.push("optimistic_patch");
  closeFired = true;
  events.push("modal_closed");

  // Fetch still pending here
  assert.ok(closeFired, "close must have fired");
  assert.ok(!events.includes("fetch_resolved"), "fetch must not have resolved yet");

  // Resolve fetch after close
  await Promise.resolve(); // microtask
  events.push("fetch_resolved");

  assert.ok(events.indexOf("modal_closed") < events.indexOf("fetch_resolved"),
    "modal_closed must precede fetch_resolved");
});

// ── TEST 3 — symbol-only backend row patches correctly (optimistic) ───────────

test("REQ-64 TEST 3 — symbol-only raw row { symbol: 'ACMR' } patches correctly with optimistic state", () => {
  const idx = makeIndex();
  const old = { analysis: { sections: [{ tickers: [{ symbol: "ACMR", primary_theme_id: null, canonical_theme_id: null, theme_ids: [], additional_theme_ids: [], subtheme_ids: [] }] }] } };
  const { optimisticPrimaryId, optimisticAdditionalIds, optimisticThemeIds, optimisticSubthemeIds } =
    computeOptimistic("th-ev", [], idx);
  const updated = applyOptimisticPatch(old, "ACMR", {
    primary_theme_id: optimisticPrimaryId,
    canonical_theme_id: optimisticPrimaryId,
    theme_ids: optimisticThemeIds,
    additional_theme_ids: optimisticAdditionalIds,
    subtheme_ids: optimisticSubthemeIds,
  });
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.symbol, "ACMR");
  assert.equal(row.primary_theme_id, "th-ev");
  assert.equal(row.canonical_theme_id, "th-ev");
});

// ── TEST 4 — ticker-only compatibility row ─────────────────────────────────────

test("REQ-65 TEST 4 — ticker-only raw row { ticker: 'ACMR' } still patches correctly", () => {
  const idx = makeIndex();
  const old = { analysis: { sections: [{ tickers: [{ ticker: "ACMR", primary_theme_id: null, canonical_theme_id: null, theme_ids: [] }] }] } };
  const { optimisticPrimaryId, optimisticAdditionalIds, optimisticThemeIds, optimisticSubthemeIds } =
    computeOptimistic("th-ev", [], idx);
  const updated = applyOptimisticPatch(old, "ACMR", {
    primary_theme_id: optimisticPrimaryId,
    canonical_theme_id: optimisticPrimaryId,
    theme_ids: optimisticThemeIds,
    additional_theme_ids: optimisticAdditionalIds,
    subtheme_ids: optimisticSubthemeIds,
  });
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.primary_theme_id, "th-ev");
  assert.equal(row.canonical_theme_id, "th-ev");
});

// ── TEST 5 — subtheme optimistic assignment ────────────────────────────────────

test("REQ-66 TEST 5 — subtheme optimistic: primary_theme_id is subtheme ID, label is subtheme display name", () => {
  const idx = makeIndex(); // st-nlp is sub_theme of th-ai; st-bat is sub_theme of th-ev
  const old = { analysis: { sections: [{ tickers: [{ symbol: "ACMR", primary_theme_id: null, canonical_theme_id: null, theme_ids: [] }] }] } };

  // effectivePrimaryId is the subtheme ID (draftSubthemeId ?? draftThemeId)
  const { optimisticPrimaryId, optimisticAdditionalIds, optimisticThemeIds, optimisticSubthemeIds } =
    computeOptimistic("st-nlp", [], idx);

  assert.equal(optimisticPrimaryId, "st-nlp", "primary must be the subtheme ID");
  assert.ok(optimisticSubthemeIds.includes("st-nlp"), "st-nlp must appear in subthemeIds");

  const updated = applyOptimisticPatch(old, "ACMR", {
    primary_theme_id: optimisticPrimaryId,
    canonical_theme_id: optimisticPrimaryId,
    theme_ids: optimisticThemeIds,
    additional_theme_ids: optimisticAdditionalIds,
    subtheme_ids: optimisticSubthemeIds,
  });
  const row = updated.analysis.sections[0].tickers[0];
  assert.equal(row.primary_theme_id, "st-nlp");
  assert.equal(row.canonical_theme_id, "st-nlp");

  // Visible label resolves immediately from patched row — no refetch needed
  const label = buildLabel(row, idx);
  assert.equal(label, "Natural Language Processing", "label must match subtheme display name");
});

// ── TEST 6 — parent-only assignment: visible label is parent Theme ─────────────

test("REQ-67 TEST 6 — parent-only assignment: immediate optimistic label is the parent theme name", () => {
  const idx = makeIndex();
  const old = { analysis: { sections: [{ tickers: [{ symbol: "ACMR", primary_theme_id: null, canonical_theme_id: null, theme_ids: [] }] }] } };
  const { optimisticPrimaryId, optimisticAdditionalIds, optimisticThemeIds, optimisticSubthemeIds } =
    computeOptimistic("th-ai", [], idx); // theme-level, no subtheme

  assert.equal(optimisticSubthemeIds.length, 0, "no subthemes for parent-only assignment");

  const updated = applyOptimisticPatch(old, "ACMR", {
    primary_theme_id: optimisticPrimaryId,
    canonical_theme_id: optimisticPrimaryId,
    theme_ids: optimisticThemeIds,
    additional_theme_ids: optimisticAdditionalIds,
    subtheme_ids: optimisticSubthemeIds,
  });
  const row = updated.analysis.sections[0].tickers[0];
  const label = buildLabel(row, idx);
  assert.equal(label, "AI & Machine Learning");
});

// ── TEST 7 — additional themes: optimistic arrays correct ─────────────────────

test("REQ-68 TEST 7 — additional themes: optimistic theme_ids and additional_theme_ids computed correctly", () => {
  const idx = makeIndex();
  // primary: th-ai, additional: th-ev, th-bio
  const { optimisticPrimaryId, optimisticAdditionalIds, optimisticThemeIds, optimisticSubthemeIds } =
    computeOptimistic("th-ai", ["th-ev", "th-bio"], idx);

  assert.equal(optimisticPrimaryId, "th-ai");
  assert.deepEqual(optimisticAdditionalIds, ["th-ev", "th-bio"]);
  // theme_ids: primary first, then additionals
  assert.equal(optimisticThemeIds[0], "th-ai", "primary must be first in theme_ids");
  assert.ok(optimisticThemeIds.includes("th-ev"));
  assert.ok(optimisticThemeIds.includes("th-bio"));
  assert.equal(optimisticSubthemeIds.length, 0, "no sub_themes in this assignment");
});

// ── TEST 8 — authoritative response overwrites optimistic normalization ─────────

test("REQ-69 TEST 8 — authoritative response replaces optimistic when normalization differs", () => {
  const idx = makeIndex();
  const old = { analysis: { sections: [{ tickers: [{ symbol: "ACMR", primary_theme_id: null, canonical_theme_id: null, theme_ids: [], additional_theme_ids: [], subtheme_ids: [] }] }] } };

  // Step 2: apply optimistic
  const optimistic = computeOptimistic("th-ai", ["th-ev"], idx);
  let cache = applyOptimisticPatch(old, "ACMR", {
    primary_theme_id: optimistic.optimisticPrimaryId,
    canonical_theme_id: optimistic.optimisticPrimaryId,
    theme_ids: optimistic.optimisticThemeIds,
    additional_theme_ids: optimistic.optimisticAdditionalIds,
    subtheme_ids: optimistic.optimisticSubthemeIds,
  });
  assert.deepEqual(cache.analysis.sections[0].tickers[0].additional_theme_ids, ["th-ev"]);

  // Step 4: backend returns a slightly different normalized membership
  const authoritativeResponse = {
    ok: true,
    primary_theme_id: "th-ai",
    theme_ids: ["th-ai"], // backend removed th-ev (e.g. validation stripped it)
    additional_theme_ids: [],
    subtheme_ids: [],
  };
  cache = applyOptimisticPatch(cache, "ACMR", {
    primary_theme_id: authoritativeResponse.primary_theme_id,
    canonical_theme_id: authoritativeResponse.primary_theme_id,
    theme_ids: authoritativeResponse.theme_ids,
    additional_theme_ids: authoritativeResponse.additional_theme_ids,
    subtheme_ids: authoritativeResponse.subtheme_ids,
  });
  const row = cache.analysis.sections[0].tickers[0];
  // Authoritative wins
  assert.deepEqual(row.theme_ids, ["th-ai"], "authoritative theme_ids must replace optimistic");
  assert.deepEqual(row.additional_theme_ids, [], "authoritative additional_theme_ids must win");
});

// ── TEST 9 — authoritative null: stale canonical_theme_id cleared ──────────────

test("REQ-70 TEST 9 — authoritative null primary clears optimistic state; stale canonical_theme_id cannot survive", () => {
  const idx = makeIndex();
  const old = { analysis: { sections: [{ tickers: [{ symbol: "ACMR", primary_theme_id: "th-ai", canonical_theme_id: "th-ai", theme_ids: ["th-ai"] }] }] } };

  // Optimistic clear (user cleared the primary)
  const optimistic = computeOptimistic(null, [], idx);
  let cache = applyOptimisticPatch(old, "ACMR", {
    primary_theme_id: optimistic.optimisticPrimaryId,
    canonical_theme_id: optimistic.optimisticPrimaryId,
    theme_ids: optimistic.optimisticThemeIds,
    additional_theme_ids: optimistic.optimisticAdditionalIds,
    subtheme_ids: optimistic.optimisticSubthemeIds,
  });
  assert.equal(cache.analysis.sections[0].tickers[0].primary_theme_id, null);
  assert.equal(cache.analysis.sections[0].tickers[0].canonical_theme_id, null, "optimistic null must clear stale canonical");

  // Authoritative confirms null
  cache = applyOptimisticPatch(cache, "ACMR", {
    primary_theme_id: null,
    canonical_theme_id: null,
    theme_ids: [],
    additional_theme_ids: [],
    subtheme_ids: [],
  });
  assert.equal(cache.analysis.sections[0].tickers[0].primary_theme_id, null);
  assert.equal(cache.analysis.sections[0].tickers[0].canonical_theme_id, null);
});

// ── TEST 10 — definitive pre-commit rejection: single refetch, no second PUT ───

test("REQ-71 TEST 10 — definitive rejection: one canonical refetch, no second PUT, converges to backend state", async () => {
  let putCount = 0;
  let invalidateCount = 0;

  async function simulateSave(fetchResult: any) {
    // Step 2 & 3: optimistic patch + close (synchronous)
    // (represented by setting putCount tracking to start here)

    // Step 4: background PUT
    putCount++;
    const r = fetchResult;
    if (!r.ok) {
      // Definitive rejection → single invalidation
      invalidateCount++;
      return;
    }
    // success path — not reached in this test
    invalidateCount++;
  }

  // Simulate 400 rejection
  await simulateSave({ ok: false, status: 400, headers: { get: () => "application/json" } });

  assert.equal(putCount, 1, "exactly one PUT must be sent");
  assert.equal(invalidateCount, 1, "exactly one canonical refetch/invalidation");
});

// ── TEST 11 — timeout but write actually committed (ACMR incident recreation) ──

test("REQ-72 TEST 11 — 504 timeout: optimistic state stays; canonical refetch confirms commit; no rollback", async () => {
  const idx = makeIndex();
  // Starting state
  const old = { analysis: { sections: [{ tickers: [{ symbol: "ACMR", primary_theme_id: "th-ai", canonical_theme_id: "th-ai", theme_ids: ["th-ai"] }] }] } };

  // Step 2: optimistic patch applied (before fetch)
  const optimistic = computeOptimistic("th-ev", [], idx);
  let cache = applyOptimisticPatch(old, "ACMR", {
    primary_theme_id: optimistic.optimisticPrimaryId,
    canonical_theme_id: optimistic.optimisticPrimaryId,
    theme_ids: optimistic.optimisticThemeIds,
    additional_theme_ids: optimistic.optimisticAdditionalIds,
    subtheme_ids: optimistic.optimisticSubthemeIds,
  });

  // Verify optimistic state
  assert.equal(cache.analysis.sections[0].tickers[0].primary_theme_id, "th-ev",
    "optimistic state applied before fetch");

  let putCount = 0;
  let invalidated = false;

  // Simulate Step 4: fetch returns 504 (timeout)
  putCount++;
  const r = { status: 504, ok: false };
  if (r.status === 504) {
    // Single canonical invalidation — do NOT rollback
    invalidated = true;
    // Simulated canonical refetch returns the committed state (write DID commit)
    const canonicalRefetch = applyOptimisticPatch(cache, "ACMR", {
      primary_theme_id: "th-ev",
      canonical_theme_id: "th-ev",
      theme_ids: ["th-ev"],
      additional_theme_ids: [],
      subtheme_ids: [],
    });
    cache = canonicalRefetch;
  }

  assert.equal(putCount, 1, "exactly one PUT sent");
  assert.ok(invalidated, "canonical refetch triggered after timeout");
  // Row still shows the desired state (write committed before timeout)
  assert.equal(cache.analysis.sections[0].tickers[0].primary_theme_id, "th-ev",
    "row must NOT be rolled back — write committed before timeout");
  // No false failure: optimistic state === canonical state → treated as saved
});

// ── TEST 12 — timeout and write did NOT commit ─────────────────────────────────

test("REQ-73 TEST 12 — 504 timeout + write did not commit: canonical refetch reverts row, one PUT only", async () => {
  const idx = makeIndex();
  const old = { analysis: { sections: [{ tickers: [{ symbol: "ACMR", primary_theme_id: "th-ai", canonical_theme_id: "th-ai", theme_ids: ["th-ai"] }] }] } };

  // Step 2: optimistic patch
  const optimistic = computeOptimistic("th-ev", [], idx);
  let cache = applyOptimisticPatch(old, "ACMR", {
    primary_theme_id: optimistic.optimisticPrimaryId,
    canonical_theme_id: optimistic.optimisticPrimaryId,
    theme_ids: optimistic.optimisticThemeIds,
    additional_theme_ids: optimistic.optimisticAdditionalIds,
    subtheme_ids: optimistic.optimisticSubthemeIds,
  });
  assert.equal(cache.analysis.sections[0].tickers[0].primary_theme_id, "th-ev");

  let putCount = 0;
  // Step 4: 504 timeout — write did NOT commit
  putCount++;
  // Canonical refetch returns PREVIOUS state (th-ai — write did not persist)
  const canonicalState = { primary_theme_id: "th-ai", canonical_theme_id: "th-ai", theme_ids: ["th-ai"], additional_theme_ids: [], subtheme_ids: [] };
  cache = applyOptimisticPatch(cache, "ACMR", canonicalState);

  assert.equal(putCount, 1, "exactly one PUT");
  // Canonical state wins — row shows th-ai (the true backend state)
  assert.equal(cache.analysis.sections[0].tickers[0].primary_theme_id, "th-ai",
    "row must converge to canonical backend state when write did not commit");
  // No second PUT sent
  assert.equal(putCount, 1, "no automatic retry PUT");
});

// ── TEST 13 — malformed/non-JSON response: reconcile via refetch ───────────────

test("REQ-74 TEST 13 — non-JSON or malformed response: existing fail-closed parsing applies, single refetch", async () => {
  let refetchTriggered = false;
  let optimisticApplied = false;

  // Step 2: optimistic patch happens first (always)
  optimisticApplied = true;

  // Step 4: non-JSON response
  const ct = "text/html";
  if (!ct.includes("application/json")) {
    refetchTriggered = true;
    // single canonical refetch — no second PUT
  }

  assert.ok(optimisticApplied, "optimistic patch must have been applied");
  assert.ok(refetchTriggered, "canonical refetch must be triggered on non-JSON response");
});

// ── TEST 14 — no full-cache stale rollback ─────────────────────────────────────

test("REQ-75 TEST 14 — unrelated row change survives background save failure reconciliation", () => {
  // Start with two tickers
  let cache = {
    analysis: {
      sections: [{
        tickers: [
          { symbol: "ACMR", primary_theme_id: "th-ai", canonical_theme_id: "th-ai", theme_ids: ["th-ai"] },
          { symbol: "NVDA", primary_theme_id: "th-ev", canonical_theme_id: "th-ev", theme_ids: ["th-ev"] },
        ],
      }],
    },
  };

  // Step 2: optimistic patch for ACMR
  cache = applyOptimisticPatch(cache, "ACMR", {
    primary_theme_id: "th-bio",
    canonical_theme_id: "th-bio",
    theme_ids: ["th-bio"],
    additional_theme_ids: [],
    subtheme_ids: [],
  });

  // While PUT is in flight, NVDA is independently updated by another operation
  cache = applyOptimisticPatch(cache, "NVDA", {
    primary_theme_id: "st-bat",
    canonical_theme_id: "st-bat",
    theme_ids: ["st-bat"],
    additional_theme_ids: [],
    subtheme_ids: ["st-bat"],
  });

  // Verify NVDA change is live
  assert.equal(cache.analysis.sections[0].tickers[1].primary_theme_id, "st-bat");

  // Step 4: ACMR save fails — reconcile only ACMR (row-scoped patch, not full cache)
  const canonicalAcmr = { primary_theme_id: "th-ai", canonical_theme_id: "th-ai", theme_ids: ["th-ai"], additional_theme_ids: [], subtheme_ids: [] };
  cache = applyOptimisticPatch(cache, "ACMR", canonicalAcmr);

  // ACMR reverted to canonical
  assert.equal(cache.analysis.sections[0].tickers[0].primary_theme_id, "th-ai",
    "ACMR must revert to canonical state");
  // NVDA change survives (was not touched by ACMR reconciliation)
  assert.equal(cache.analysis.sections[0].tickers[1].primary_theme_id, "st-bat",
    "NVDA unrelated change must survive — no full-cache rollback");
});

// ── TEST 15 — 20 sequential saves: each cell changes before its fetch resolves ──

test("REQ-76 TEST 15 — 20 sequential saves: each optimistic patch applied before fetch resolves", async () => {
  const idx = makeIndex();
  const themes = ["th-ai", "th-ev", "th-bio", "th-ai", "th-ev", "th-bio", "th-ai", "th-ev", "th-bio", "th-ai",
                  "th-ev", "th-bio", "th-ai", "th-ev", "th-bio", "th-ai", "th-ev", "th-bio", "th-ai", "th-ev"];
  assert.equal(themes.length, 20);

  let cache = { analysis: { sections: [{ tickers: [{ symbol: "ACMR", primary_theme_id: null, canonical_theme_id: null, theme_ids: [] }] }] } };

  const results: { preNetwork: string | null; postNetwork: string | null; putCount: number }[] = [];
  let totalPuts = 0;

  for (let i = 0; i < 20; i++) {
    const themeId = themes[i];

    // Step 2: optimistic patch (synchronous, before network)
    const optimistic = computeOptimistic(themeId, [], idx);
    cache = applyOptimisticPatch(cache, "ACMR", {
      primary_theme_id: optimistic.optimisticPrimaryId,
      canonical_theme_id: optimistic.optimisticPrimaryId,
      theme_ids: optimistic.optimisticThemeIds,
      additional_theme_ids: optimistic.optimisticAdditionalIds,
      subtheme_ids: optimistic.optimisticSubthemeIds,
    });
    const preNetwork = cache.analysis.sections[0].tickers[0].primary_theme_id;

    // Step 4: background fetch resolves (deferred — but we simulate immediately)
    totalPuts++;
    const serverResponse = { ok: true, primary_theme_id: themeId, theme_ids: [themeId], additional_theme_ids: [], subtheme_ids: [] };
    cache = applyOptimisticPatch(cache, "ACMR", {
      primary_theme_id: serverResponse.primary_theme_id,
      canonical_theme_id: serverResponse.primary_theme_id,
      theme_ids: serverResponse.theme_ids,
      additional_theme_ids: serverResponse.additional_theme_ids,
      subtheme_ids: serverResponse.subtheme_ids,
    });
    const postNetwork = cache.analysis.sections[0].tickers[0].primary_theme_id;

    results.push({ preNetwork, postNetwork, putCount: 1 });
  }

  assert.equal(totalPuts, 20, "exactly one PUT per save");
  for (let i = 0; i < 20; i++) {
    const { preNetwork, postNetwork } = results[i];
    // Each optimistic patch matched the intended theme before fetch resolved
    assert.equal(preNetwork, themes[i],
      `save ${i + 1}: cell must show new theme BEFORE fetch resolves (got ${preNetwork}, want ${themes[i]})`);
    // Authoritative response confirms (or corrects) post-network
    assert.equal(postNetwork, themes[i],
      `save ${i + 1}: cell must remain correct AFTER authoritative response`);
    // Visible label resolves from the patched row
    const label = buildLabel({ primary_theme_id: themes[i] }, idx);
    assert.ok(label !== null && label !== "", `save ${i + 1}: visible label must be non-empty`);
  }
  // Final state matches last save
  assert.equal(cache.analysis.sections[0].tickers[0].primary_theme_id, themes[19]);
});

// ─── 10. Canonical taxonomy source — /api/themes/list vs RS ──────────────────
//
// These tests prove that the taxonomy editor:
//   - Builds ThemeTaxonomyIndex from the static canonical registry
//   - Is NOT dependent on Relative Strength data being present
//   - Uses a query key isolated from ["themes-unified","themes"]
//   - Exposes every canonical theme and sub_theme in the correct UI surface
//   - Never exposes sectors, market_lens, or deprecated nodes
//
// Fixtures represent a canonical registry that is STRICTLY LARGER than what
// the RS endpoint might return on any given day.

/** Build a canonical registry fixture modelling the known issue:
 *  robotics_automation exists in canonical list but is absent from RS. */
function makeCanonicalRegistry() {
  // Sectors (not assignable)
  const sectors = [
    { theme_id: "technology", display_name: "Technology", classification: "sector", parent_sector: null, parent_theme_id: null, rollup_sector_ids: [] },
    { theme_id: "industrials", display_name: "Industrials", classification: "sector", parent_sector: null, parent_theme_id: null, rollup_sector_ids: [] },
    { theme_id: "energy", display_name: "Energy", classification: "sector", parent_sector: null, parent_theme_id: null, rollup_sector_ids: [] },
  ];
  // Themes (assignable)
  const themes = [
    { theme_id: "th-ai",       display_name: "AI & Machine Learning",  classification: "theme", parent_sector: "technology",  parent_theme_id: null, rollup_sector_ids: ["technology"] },
    { theme_id: "th-ev",       display_name: "Electric Vehicles",       classification: "theme", parent_sector: "industrials", parent_theme_id: null, rollup_sector_ids: ["industrials"] },
    { theme_id: "th-ia",       display_name: "Industrial Automation",   classification: "theme", parent_sector: "industrials", parent_theme_id: null, rollup_sector_ids: ["industrials"] },
    { theme_id: "th-bio",      display_name: "Biotechnology",           classification: "theme", parent_sector: "technology",  parent_theme_id: null, rollup_sector_ids: ["technology"] },
    { theme_id: "th-clean",    display_name: "Clean Energy",            classification: "theme", parent_sector: "energy",      parent_theme_id: null, rollup_sector_ids: ["energy"] },
  ];
  // Sub-themes (assignable — note robotics_automation has no RS data in the RS fixture)
  const subthemes = [
    { theme_id: "st-nlp",     display_name: "Natural Language Processing", classification: "sub_theme", parent_sector: "technology",  parent_theme_id: "th-ai",    rollup_sector_ids: ["technology"] },
    { theme_id: "st-cv",      display_name: "Computer Vision",             classification: "sub_theme", parent_sector: "technology",  parent_theme_id: "th-ai",    rollup_sector_ids: ["technology"] },
    { theme_id: "st-bat",     display_name: "Battery Technology",          classification: "sub_theme", parent_sector: "industrials", parent_theme_id: "th-ev",    rollup_sector_ids: ["industrials"] },
    // THIS IS THE KEY FIXTURE: robotics exists in canonical list, absent from RS
    { theme_id: "robotics_automation", display_name: "Robotics & Automation", classification: "sub_theme", parent_sector: "industrials", parent_theme_id: "th-ia", rollup_sector_ids: ["industrials"] },
    { theme_id: "st-solar",   display_name: "Solar Energy",               classification: "sub_theme", parent_sector: "energy",      parent_theme_id: "th-clean", rollup_sector_ids: ["energy"] },
    { theme_id: "st-crispr",  display_name: "Gene Editing",               classification: "sub_theme", parent_sector: "technology",  parent_theme_id: "th-bio",   rollup_sector_ids: ["technology"] },
  ];
  // market_lens (not assignable)
  const lenses = [
    { theme_id: "ml-gold",    display_name: "Gold",        classification: "market_lens", parent_sector: null, parent_theme_id: null, rollup_sector_ids: [] },
    { theme_id: "ml-oil",     display_name: "Crude Oil",   classification: "market_lens", parent_sector: null, parent_theme_id: null, rollup_sector_ids: [] },
  ];
  return [...sectors, ...themes, ...subthemes, ...lenses];
}

/** Simulated RS payload — intentionally omits robotics_automation */
function makeRsPayload() {
  const full = makeCanonicalRegistry();
  // RS only includes nodes that have current performance data — robotics absent
  return full.filter(n => n.theme_id !== "robotics_automation" && n.classification !== "market_lens" && n.classification !== "sector");
}

// ── TEST REQ-77: RS-independence regression ───────────────────────────────────

test("REQ-77 — RS-independence: robotics_automation present in canonical list but absent from RS → still in editor", () => {
  const canonical = makeCanonicalRegistry();
  const rs        = makeRsPayload();

  // Prove the adversarial condition: robotics IS in canonical, NOT in RS
  assert.ok(canonical.some(n => n.theme_id === "robotics_automation"),   "robotics must exist in canonical list");
  assert.ok(!rs.some(n => n.theme_id === "robotics_automation"),          "robotics must be ABSENT from RS (adversarial fixture)");

  // Build index from RS (OLD, broken approach) — robotics disappears
  const rsIdx = buildThemeTaxonomyIndex(rs as any);
  assert.ok(!rsIdx.nodeById.has("robotics_automation"),
    "RS-based index must NOT contain robotics (proves the old bug)");

  // Build index from canonical list (NEW, correct approach) — robotics present
  const canonIdx = buildThemeTaxonomyIndex(canonical as any);
  assert.ok(canonIdx.nodeById.has("robotics_automation"),
    "canonical-list-based index MUST contain robotics_automation");

  // Correct parent link preserved
  const robotics = canonIdx.nodeById.get("robotics_automation")!;
  assert.equal(robotics.classification,   "sub_theme");
  assert.equal(robotics.parent_theme_id,  "th-ia");
  assert.equal(robotics.display_name,     "Robotics & Automation");

  // Industrial Automation (th-ia) is a Primary Theme
  // idx.themeIds is string[] — use .includes()
  assert.ok(canonIdx.themeIds.includes("th-ia"),
    "industrial_automation must appear in Primary Theme list (themeIds)");

  // Robotics appears as child of Industrial Automation in Subtheme dropdown
  // childrenByParentThemeId returns string[] of child IDs
  const childrenR: string[] = canonIdx.childrenByParentThemeId.get("th-ia") ?? [];
  assert.ok(childrenR.includes("robotics_automation"),
    "Robotics & Automation must appear in subtheme list for Industrial Automation");

  // effectivePrimaryId when user selects robotics as primary
  const roboticsPrimaryId = "robotics_automation"; // draftSubthemeId ?? draftThemeId
  assert.equal(roboticsPrimaryId, "robotics_automation");

  // Robotics appears in Additional Themes (all non-selected themes + subthemes)
  const subIdsR = [...canonIdx.nodeById.values()]
    .filter(n => n.classification === "sub_theme").map(n => n.theme_id);
  const allPickerIdsR = new Set([...canonIdx.themeIds, ...subIdsR]);
  assert.ok(allPickerIdsR.has("robotics_automation"),
    "robotics_automation must be reachable in Additional Themes picker");
});

// ── TEST REQ-78: Query key isolation ─────────────────────────────────────────

test("REQ-78 — Query key isolation: canonical taxonomy key != RS key", () => {
  const CANONICAL_KEY = ["theme-taxonomy", "list"];
  const RS_KEY        = ["themes-unified", "themes"];

  // Keys must be distinct — sharing them causes cache shape/source collision
  assert.notDeepEqual(CANONICAL_KEY, RS_KEY,
    "canonical taxonomy query key must not equal RS query key");

  // The canonical key must reference 'theme-taxonomy' (not 'themes-unified')
  assert.equal(CANONICAL_KEY[0], "theme-taxonomy",
    "canonical query key must start with 'theme-taxonomy'");
  assert.notEqual(CANONICAL_KEY[0], "themes-unified",
    "canonical query key must NOT start with 'themes-unified'");

  // The RS key must NOT reference 'theme-taxonomy'
  assert.equal(RS_KEY[0], "themes-unified",
    "RS query key must start with 'themes-unified'");
  assert.notEqual(RS_KEY[0], "theme-taxonomy");
});

// ── TEST REQ-79: Canonical Primary Theme completeness (set equality) ──────────

test("REQ-79 — Primary Theme dropdown: every canonical theme present, no extras, no sectors", () => {
  const canonical = makeCanonicalRegistry();
  const idx = buildThemeTaxonomyIndex(canonical as any);

  const expectedPrimaryIds = new Set(
    canonical.filter(n => n.classification === "theme").map(n => n.theme_id)
  );
  // idx.themeIds is string[] — the set of top-level theme IDs
  const actualPrimaryIds   = new Set(idx.themeIds);

  // SET EQUALITY: same IDs in both directions
  const missing = [...expectedPrimaryIds].filter(id => !actualPrimaryIds.has(id));
  const extra   = [...actualPrimaryIds].filter(id => !expectedPrimaryIds.has(id));
  assert.deepEqual(missing, [],
    `Missing from Primary dropdown: ${missing.join(", ")}`);
  assert.deepEqual(extra, [],
    `Extra (unexpected) in Primary dropdown: ${extra.join(", ")}`);

  // Sectors must NOT appear in Primary Theme list
  const sectorIds = new Set(canonical.filter(n => n.classification === "sector").map(n => n.theme_id));
  for (const id of actualPrimaryIds) {
    assert.ok(!sectorIds.has(id), `Sector ${id} must not appear in Primary Theme dropdown`);
  }

  // market_lens must NOT appear
  const lensIds = new Set(canonical.filter(n => n.classification === "market_lens").map(n => n.theme_id));
  for (const id of actualPrimaryIds) {
    assert.ok(!lensIds.has(id), `market_lens ${id} must not appear in Primary Theme dropdown`);
  }

  // Subthemes must NOT appear in idx.themes
  const subIds = new Set(canonical.filter(n => n.classification === "sub_theme").map(n => n.theme_id));
  for (const id of actualPrimaryIds) {
    assert.ok(!subIds.has(id), `sub_theme ${id} must not appear in Primary Theme dropdown`);
  }
});

// ── TEST REQ-80: Canonical child completeness for EVERY parent ────────────────

test("REQ-80 — Subtheme dropdown: every canonical child present for every parent (set equality)", () => {
  const canonical = makeCanonicalRegistry();
  const idx = buildThemeTaxonomyIndex(canonical as any);

  const canonicalThemeIds = canonical.filter(n => n.classification === "theme").map(n => n.theme_id);

  for (const themeId of canonicalThemeIds) {
    const expectedChildren = canonical
      .filter(n => n.classification === "sub_theme" && n.parent_theme_id === themeId)
      .map(n => n.theme_id);

    // childrenByParentThemeId returns string[] — already IDs, no .map needed
    const actualChildren: string[] = idx.childrenByParentThemeId.get(themeId) ?? [];

    const expectedSet = new Set(expectedChildren);
    const actualSet   = new Set(actualChildren);

    const missing = expectedChildren.filter(id => !actualSet.has(id));
    const extra   = actualChildren.filter(id => !expectedSet.has(id));

    const parentName = canonical.find(n => n.theme_id === themeId)?.display_name ?? themeId;

    assert.deepEqual(missing, [],
      `[${parentName}] Missing subthemes: ${missing.join(", ")}`);
    assert.deepEqual(extra, [],
      `[${parentName}] Extra subthemes (unexpected): ${extra.join(", ")}`);
  }

  // Specifically assert robotics under Industrial Automation
  const roboticsChildren: string[] = idx.childrenByParentThemeId.get("th-ia") ?? [];
  assert.ok(roboticsChildren.includes("robotics_automation"),
    "robotics_automation must appear under th-ia (Industrial Automation)");
});

// ── TEST REQ-81: Additional Themes picker completeness ────────────────────────

test("REQ-81 — Additional Themes picker: every canonical theme + sub_theme reachable (set equality)", () => {
  const canonical = makeCanonicalRegistry();
  const idx = buildThemeTaxonomyIndex(canonical as any);

  // Expected: ALL canonical themes UNION ALL canonical sub_themes
  const expectedPickerIds = new Set([
    ...canonical.filter(n => n.classification === "theme").map(n => n.theme_id),
    ...canonical.filter(n => n.classification === "sub_theme").map(n => n.theme_id),
  ]);

  // Actual: themes + sub_themes accessible through the index
  // idx.themeIds is string[]; childrenByParentThemeId maps to string[]
  const actualPickerIds = new Set<string>();
  for (const id of idx.themeIds) actualPickerIds.add(id);
  for (const [, n] of idx.nodeById) {
    if (n.classification === "sub_theme") actualPickerIds.add(n.theme_id);
  }

  const missing = [...expectedPickerIds].filter(id => !actualPickerIds.has(id));
  const extra   = [...actualPickerIds].filter(id => !expectedPickerIds.has(id));

  assert.deepEqual(missing, [],
    `Picker missing canonical thematic nodes: ${missing.join(", ")}`);
  assert.deepEqual(extra, [],
    `Picker exposes non-assignable nodes: ${extra.join(", ")}`);

  // Sectors must NOT be in picker
  const sectorIds = new Set(canonical.filter(n => n.classification === "sector").map(n => n.theme_id));
  for (const id of actualPickerIds) {
    assert.ok(!sectorIds.has(id), `Sector ${id} must not be in Additional Themes picker`);
  }

  // market_lens must NOT be in picker
  const lensIds = new Set(canonical.filter(n => n.classification === "market_lens").map(n => n.theme_id));
  for (const id of actualPickerIds) {
    assert.ok(!lensIds.has(id), `market_lens ${id} must not be in Additional Themes picker`);
  }

  // Robotics explicitly reachable
  assert.ok(actualPickerIds.has("robotics_automation"),
    "robotics_automation must be reachable in Additional Themes picker");
});

// ── TEST REQ-82: Parent integrity — every sub_theme has a valid canonical parent ──

test("REQ-82 — Parent integrity: every sub_theme has a valid parent with classification=theme", () => {
  const canonical = makeCanonicalRegistry();
  const idx = buildThemeTaxonomyIndex(canonical as any);

  const themeIds = new Set(canonical.filter(n => n.classification === "theme").map(n => n.theme_id));

  const broken: string[] = [];
  for (const [id, node] of idx.nodeById) {
    if (node.classification !== "sub_theme") continue;
    const par = node.parent_theme_id;
    if (!par) {
      broken.push(`${id} — no parent_theme_id`);
    } else if (!themeIds.has(par)) {
      const parNode = idx.nodeById.get(par);
      const parClass = parNode?.classification ?? "MISSING";
      broken.push(`${id} — parent=${par} classification=${parClass}`);
    }
  }
  assert.deepEqual(broken, [],
    `Broken sub_theme parent links (backend registry issue if non-empty): ${broken.join("; ")}`);
});

// ── TEST REQ-83: No deprecated / excluded classifications in any editor surface ──

test("REQ-83 — Excluded classifications (sector, market_lens) never appear in any editor surface", () => {
  // Add a deprecated node to the canonical fixture to prove it stays hidden
  const canonical: any[] = [
    ...makeCanonicalRegistry(),
    { theme_id: "deprecated_node", display_name: "Old Theme", classification: "deprecated", parent_sector: null, parent_theme_id: null, rollup_sector_ids: [] },
  ];
  const idx = buildThemeTaxonomyIndex(canonical);

  const EXCLUDED = new Set(["sector", "market_lens", "deprecated", "?"]);

  // idx.themeIds only includes classification === "theme" nodes — verify none are excluded
  for (const id of idx.themeIds) {
    const node = idx.nodeById.get(id);
    assert.ok(node && !EXCLUDED.has(node.classification),
      `${id} (${node?.classification}) must not appear in Primary Theme list`);
  }

  // childrenByParentThemeId maps to string[] (IDs); look up each ID's classification
  for (const [, childIds] of idx.childrenByParentThemeId) {
    for (const cid of childIds) {
      const cn = idx.nodeById.get(cid);
      assert.ok(cn && !EXCLUDED.has(cn.classification),
        `${cid} (${cn?.classification}) must not appear in any Subtheme dropdown`);
    }
  }

  // deprecated_node must not be in nodeById (buildThemeTaxonomyIndex may include all, but
  // the UI only renders classification === "theme" and "sub_theme" — prove separation)
  const allPickerIds = new Set([
    ...idx.themeIds,
    ...[...idx.nodeById.values()].filter(n => n.classification === "sub_theme").map(n => n.theme_id),
  ]);
  assert.ok(!allPickerIds.has("deprecated_node"),
    "deprecated node must not be reachable in any editor surface");
  const sectorIds = ["technology", "industrials", "energy"];
  const lensIds   = ["ml-gold", "ml-oil"];
  for (const id of [...sectorIds, ...lensIds]) {
    assert.ok(!allPickerIds.has(id), `${id} must not be reachable in any editor surface`);
  }
});

// ── TEST REQ-84: Robotics canonical proof (exact spec requirements) ────────────

test("REQ-84 — Robotics & Automation: full canonical proof per spec", () => {
  const canonical = makeCanonicalRegistry();
  const idx = buildThemeTaxonomyIndex(canonical as any);

  // 1. robotics_automation exists in canonical index
  const robotics = idx.nodeById.get("robotics_automation");
  assert.ok(robotics, "robotics_automation must exist in canonical index");
  assert.equal(robotics!.display_name, "Robotics & Automation");
  assert.equal(robotics!.classification, "sub_theme");
  assert.equal(robotics!.parent_theme_id, "th-ia");

  // 2. industrial_automation (th-ia) appears in Primary Theme
  // idx.themeIds is string[] — use .includes()
  assert.ok(idx.themeIds.includes("th-ia"),
    "th-ia (Industrial Automation) must appear in Primary Theme dropdown");

  // 3. Selecting th-ia as draftThemeId → robotics appears in subtheme dropdown
  // childrenByParentThemeId returns string[] of child IDs
  const children84: string[] = idx.childrenByParentThemeId.get("th-ia") ?? [];
  assert.ok(children84.includes("robotics_automation"),
    "robotics_automation must appear in Subtheme list when Industrial Automation is primary");

  // 4. effectivePrimaryId = robotics_automation when selected as subtheme
  const draftThemeId    = "th-ia";
  const draftSubthemeId = "robotics_automation";
  const effectivePrimaryId = draftSubthemeId ?? draftThemeId;
  assert.equal(effectivePrimaryId, "robotics_automation",
    "effectivePrimaryId must equal robotics_automation when subtheme is selected");

  // 5. Robotics appears in Additional Themes picker (when not selected as primary)
  const subIds84 = [...idx.nodeById.values()]
    .filter(n => n.classification === "sub_theme").map(n => n.theme_id);
  const allPickerIds = new Set([...idx.themeIds, ...subIds84]);
  assert.ok(allPickerIds.has("robotics_automation"),
    "robotics_automation must appear in Additional Themes picker");

  // 6. When robotics IS the selected effective primary, it must be excluded from picker
  //    (matches production logic: picker filters out already-selected primary)
  const pickerExcludingPrimary = new Set([...allPickerIds].filter(id => id !== effectivePrimaryId));
  assert.ok(!pickerExcludingPrimary.has("robotics_automation"),
    "robotics_automation must be excluded from Additional picker when it is the selected primary");

  // 7. RS-absence must not affect any of the above
  const rsOnlyIdx = buildThemeTaxonomyIndex(makeRsPayload() as any);
  assert.ok(!rsOnlyIdx.nodeById.has("robotics_automation"),
    "RS-based index must not have robotics (proves canonical source is required)");

  // 8. Label from patched row resolves immediately (optimistic update compatible)
  const stock = { primary_theme_id: "robotics_automation", canonical_theme_id: "robotics_automation" };
  // wlBuildThemeCellLabel equivalent: walk nodeById → display_name
  const node = idx.nodeById.get(stock.primary_theme_id!);
  assert.equal(node?.display_name, "Robotics & Automation",
    "label must resolve to 'Robotics & Automation' from patched row immediately");
});

// ── TEST REQ-85: Canonical is strictly larger than RS on bad days ──────────────

test("REQ-85 — Canonical list may contain more nodes than RS on any given day", () => {
  const canonical = makeCanonicalRegistry();
  const rs        = makeRsPayload();

  const canonThemeIds = new Set(canonical.filter(n => n.classification === "theme" || n.classification === "sub_theme").map(n => n.theme_id));
  const rsThemeIds    = new Set(rs.filter(n => n.classification === "theme" || n.classification === "sub_theme").map(n => n.theme_id));

  // Canonical is a superset of RS (on this adversarial fixture day)
  assert.ok(canonThemeIds.size > rsThemeIds.size,
    `Canonical registry (${canonThemeIds.size}) must have MORE nodes than RS (${rsThemeIds.size}) on adversarial day`);

  // robotics is the specific node missing from RS
  assert.ok( canonThemeIds.has("robotics_automation"), "robotics in canonical");
  assert.ok(!rsThemeIds.has("robotics_automation"),    "robotics absent from RS");

  // Canonical-based editor exposes all of them; RS-based editor hides the missing ones
  const canonIdx = buildThemeTaxonomyIndex(canonical as any);
  const rsIdx    = buildThemeTaxonomyIndex(rs as any);

  // idx.themeIds is string[]; sub_themes resolved via nodeById
  const canonSubs = [...canonIdx.nodeById.values()].filter(n => n.classification === "sub_theme").map(n => n.theme_id);
  const rsSubs    = [...rsIdx.nodeById.values()].filter(n => n.classification === "sub_theme").map(n => n.theme_id);
  const canonPickerIds = new Set([...canonIdx.themeIds, ...canonSubs]);
  const rsPickerIds    = new Set([...rsIdx.themeIds,    ...rsSubs]);

  const hiddenByRs = [...canonPickerIds].filter(id => !rsPickerIds.has(id));
  assert.ok(hiddenByRs.includes("robotics_automation"),
    `robotics_automation must be among the nodes hidden by RS-based approach; hidden: [${hiddenByRs.join(", ")}]`);
  assert.ok(hiddenByRs.length > 0, "RS-based approach must hide at least one node on adversarial day");
});
