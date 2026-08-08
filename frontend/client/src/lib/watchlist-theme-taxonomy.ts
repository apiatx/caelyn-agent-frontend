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
  const nodeEntries = Array.from(nodeById.entries());
  for (let i = 0; i < nodeEntries.length; i++) {
    const [id, node] = nodeEntries[i];
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

  const childLists = Array.from(childrenByParentThemeId.values());
  for (let i = 0; i < childLists.length; i++) {
    childLists[i].sort();
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
      for (let i = 0; i < children.length; i++) {
        const childId = children[i];
        result.add(childId);
        const childDesc = collectDescendants(childId, visiting);
        if (childDesc) {
          const childDescArr = Array.from(childDesc);
          for (let j = 0; j < childDescArr.length; j++) {
            result.add(childDescArr[j]);
          }
        }
      }
    }
    visiting.delete(rootId);
    descendantIdsByThemeId.set(rootId, result);
    return result;
  }

  const allIds = Array.from(nodeById.keys()).sort();
  for (let i = 0; i < allIds.length; i++) {
    collectDescendants(allIds[i], new Set());
  }

  const sectorIds: string[] = [];
  const themeIds: string[] = [];
  const standaloneSubthemeIds: string[] = [];

  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i];
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
    for (let i = 0; i < themeIds.length; i++) {
      const id = themeIds[i];
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
  const rowThemeIdsArr = Array.from(rowThemeIds);
  const rowSectorId = typeof row.sector_id === "string" && row.sector_id.length > 0 ? row.sector_id : null;

  const selIdsArr = Array.from(selectedIds);
  for (let si = 0; si < selIdsArr.length; si++) {
    const selId = selIdsArr[si];
    const selNode = index.nodeById.get(selId);
    if (!selNode) continue;

    if (selNode.classification === "sector") {
      if (rowSectorId === selId) return true;
      for (let ti = 0; ti < rowThemeIdsArr.length; ti++) {
        const tid = rowThemeIdsArr[ti];
        const tNode = index.nodeById.get(tid);
        if (tNode && tNode.rollup_sector_ids.includes(selId)) return true;
      }
      continue;
    }

    const matchSet = new Set<string>([selId]);
    const descendants = index.descendantIdsByThemeId.get(selId);
    if (descendants) {
      const descArr = Array.from(descendants);
      for (let di = 0; di < descArr.length; di++) {
        matchSet.add(descArr[di]);
      }
    }

    for (let ti = 0; ti < rowThemeIdsArr.length; ti++) {
      if (matchSet.has(rowThemeIdsArr[ti])) return true;
    }
  }

  return false;
}

export function getTaxonomyChipOrder(index: ThemeTaxonomyIndex): {
  sectorOrder: string[];
  themeOrder: string[];
  subthemeOrder: string[];
} {
  const { nodeById } = index;

  const sectorOrder = [...index.sectorIds].sort((a, b) => {
    const na = nodeById.get(a);
    const nb = nodeById.get(b);
    return (na?.display_name ?? a).localeCompare(nb?.display_name ?? b);
  });

  const themeArr: string[] = [];
  const subthemeArr: string[] = [];

  const allIds = Array.from(nodeById.keys());
  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i];
    const node = nodeById.get(id);
    if (!node) continue;
    const cls = node.classification;
    // Explicitly exclude market_lens and deprecated from all filter rows
    if (cls === "market_lens" || cls === "deprecated") continue;
    if (cls === "theme") {
      themeArr.push(id);
    } else if (cls === "sub_theme") {
      subthemeArr.push(id);
    }
  }

  const sortByName = (a: string, b: string) => {
    const na = nodeById.get(a);
    const nb = nodeById.get(b);
    return (na?.display_name ?? a).localeCompare(nb?.display_name ?? b);
  };

  return {
    sectorOrder,
    themeOrder: themeArr.sort(sortByName),
    subthemeOrder: subthemeArr.sort(sortByName),
  };
}
