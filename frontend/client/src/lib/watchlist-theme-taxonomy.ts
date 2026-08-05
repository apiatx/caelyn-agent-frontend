export interface ThemeTaxonomyNode {
  theme_id: string;
  display_name: string;
  classification: "sector" | "theme" | "sub_theme" | string | null;
  parent_sector: string | null;
  parent_theme_id: string | null;
  rollup_sector_ids: string[];
}

export interface WatchlistTaxonomyRow {
  sector_id?: string | null;
  primary_theme_id?: string | null;
  theme_ids?: string[];
  subtheme_ids?: string[];
  canonical_theme_id?: string | null;
}

export interface ThemeTaxonomyIndex {
  nodeById: Map<string, ThemeTaxonomyNode>;
  childrenByParentThemeId: Map<string, string[]>;
  descendantIdsByThemeId: Map<string, Set<string>>;
  sectorIds: string[];
  themeIds: string[];
  standaloneSubthemeIds: string[];
}

let _missingContractWarned = false;

export function buildThemeTaxonomyIndex(nodes: ThemeTaxonomyNode[]): ThemeTaxonomyIndex {
  const nodeById = new Map<string, ThemeTaxonomyNode>();
  const seen = new Set<string>();

  for (const node of nodes) {
    if (!node?.theme_id) continue;
    if (seen.has(node.theme_id)) continue;
    seen.add(node.theme_id);
    nodeById.set(node.theme_id, {
      theme_id: node.theme_id,
      display_name: node.display_name ?? node.theme_id,
      classification: node.classification ?? null,
      parent_sector: node.parent_sector ?? null,
      parent_theme_id: node.parent_theme_id ?? null,
      rollup_sector_ids: Array.isArray(node.rollup_sector_ids) ? node.rollup_sector_ids : [],
    });
  }

  const childrenByParentThemeId = new Map<string, string[]>();
  for (const [id, node] of nodeById) {
    const parent = node.parent_theme_id;
    if (!parent) continue;
    if (!nodeById.has(parent)) {
      if (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) {
        console.warn(`[taxonomy] parent_theme_id "${parent}" (referenced by "${id}") not found in taxonomy`);
      }
      continue;
    }
    const list = childrenByParentThemeId.get(parent);
    if (list) {
      list.push(id);
    } else {
      childrenByParentThemeId.set(parent, [id]);
    }
  }

  for (const [, list] of childrenByParentThemeId) {
    list.sort();
  }

  const descendantIdsByThemeId = new Map<string, Set<string>>();
  function collectDescendants(rootId: string, visiting: Set<string>): Set<string> | null {
    if (visiting.has(rootId)) {
      if (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) {
        console.warn(`[taxonomy] cycle detected involving theme_id "${rootId}"`);
      }
      return null;
    }
    const cached = descendantIdsByThemeId.get(rootId);
    if (cached) return cached;

    visiting.add(rootId);
    const result = new Set<string>();
    const children = childrenByParentThemeId.get(rootId);
    if (children) {
      for (const childId of children) {
        result.add(childId);
        const childDesc = collectDescendants(childId, visiting);
        if (childDesc) {
          for (const d of childDesc) result.add(d);
        }
      }
    }
    visiting.delete(rootId);
    descendantIdsByThemeId.set(rootId, result);
    return result;
  }

  const allIds = [...nodeById.keys()].sort();
  for (const id of allIds) {
    collectDescendants(id, new Set());
  }

  const sectorIds: string[] = [];
  const themeIds: string[] = [];
  const standaloneSubthemeIds: string[] = [];

  for (const id of allIds) {
    const node = nodeById.get(id);
    if (!node) continue;
    if (node.classification === "sector") {
      sectorIds.push(id);
    } else if (node.classification === "theme") {
      themeIds.push(id);
    } else if (node.classification === "sub_theme") {
      if (!node.parent_theme_id || !nodeById.has(node.parent_theme_id)) {
        standaloneSubthemeIds.push(id);
      }
    }
  }

  return {
    nodeById,
    childrenByParentThemeId,
    descendantIdsByThemeId,
    sectorIds,
    themeIds,
    standaloneSubthemeIds,
  };
}

export function getEffectiveRowThemeIds(row: WatchlistTaxonomyRow): Set<string> {
  const ids = new Set<string>();
  const themeIds = row.theme_ids;
  if (Array.isArray(themeIds)) {
    for (const id of themeIds) {
      if (typeof id === "string" && id.length > 0) ids.add(id);
    }
  }
  const primaryId = row.primary_theme_id;
  if (typeof primaryId === "string" && primaryId.length > 0 && !ids.has(primaryId)) {
    ids.add(primaryId);
  }
  if (ids.size === 0 && typeof row.canonical_theme_id === "string" && row.canonical_theme_id.length > 0) {
    ids.add(row.canonical_theme_id);
  }
  if (ids.size === 0 && !_missingContractWarned) {
    _missingContractWarned = true;
    if (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) {
      console.warn("[taxonomy] Watchlist row has no theme_ids, primary_theme_id, or canonical_theme_id — theme filtering will not match this row");
    }
  }
  return ids;
}

export function rowMatchesTaxonomySelection(
  row: WatchlistTaxonomyRow,
  selectedIds: Set<string>,
  index: ThemeTaxonomyIndex,
): boolean {
  if (selectedIds.size === 0) return true;

  const rowThemeIds = getEffectiveRowThemeIds(row);
  const rowSectorId = typeof row.sector_id === "string" && row.sector_id.length > 0 ? row.sector_id : null;

  for (const selId of selectedIds) {
    const selNode = index.nodeById.get(selId);
    if (!selNode) continue;

    if (selNode.classification === "sector") {
      if (rowSectorId === selId) return true;
      for (const tid of rowThemeIds) {
        const tNode = index.nodeById.get(tid);
        if (tNode && tNode.rollup_sector_ids.includes(selId)) return true;
      }
      continue;
    }

    const matchSet = new Set<string>([selId]);
    const descendants = index.descendantIdsByThemeId.get(selId);
    if (descendants) {
      for (const d of descendants) matchSet.add(d);
    }

    for (const tid of rowThemeIds) {
      if (matchSet.has(tid)) return true;
    }
  }

  return false;
}
