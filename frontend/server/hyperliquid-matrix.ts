type MatrixTab = {
  label?: string;
  count?: number;
  assets?: any[];
  [key: string]: any;
};

type MatrixPayload = {
  tabs?: Record<string, MatrixTab>;
  warnings?: string[];
  [key: string]: any;
};

const EQUITY_SYMBOLS = new Set([
  'AAOI', 'AVGO', 'CIEN', 'COHR', 'CRDO', 'CRWD', 'GLW', 'GPRO', 'IGV',
  'IREN', 'LRCX', 'MELI', 'NBIS', 'NET', 'RDDT', 'SMCI', 'SOFI', 'STX',
  'TER', 'TTWO', 'UNITREE', 'VST',
]);

const PRE_IPO_SYMBOLS = new Set(['ANTH', 'OAI']);
const INDEX_SYMBOLS = new Set(['10Y']);
const SPECIALTY_TABS = new Set(['commodities', 'indices', 'pre_ipo', 'themes']);

const symbolOf = (asset: any): string =>
  String(asset?.coin ?? asset?.display_name ?? '').trim().toUpperCase();

const canonicalIdOf = (asset: any): string =>
  String(asset?.canonical_coin_id ?? asset?.canonicalCoinId ?? '').trim().toLowerCase();

const normalizedTabFor = (asset: any, upstreamTab: string): string => {
  const symbol = symbolOf(asset);
  if (SPECIALTY_TABS.has(upstreamTab)) return upstreamTab;
  if (EQUITY_SYMBOLS.has(symbol)) return 'stocks_etfs';
  if (PRE_IPO_SYMBOLS.has(symbol)) return 'pre_ipo';
  if (INDEX_SYMBOLS.has(symbol)) return 'indices';

  const tags = Array.isArray(asset?.tags)
    ? asset.tags.map((tag: any) => String(tag).toLowerCase())
    : [];
  if (tags.includes('equity') || tags.includes('stock') || tags.includes('etf')) {
    return 'stocks_etfs';
  }

  // Preserve the upstream specialty categories and all remaining membership.
  // This phase intentionally does not add or remove markets from the universe.
  return upstreamTab;
};

const evidenceScore = (asset: any, upstreamTab: string, normalizedTab: string): number => {
  const tags = Array.isArray(asset?.tags)
    ? asset.tags.map((tag: any) => String(tag).toLowerCase())
    : [];
  const canonicalId = canonicalIdOf(asset);
  let score = upstreamTab === normalizedTab ? 20 : 0;
  if (SPECIALTY_TABS.has(normalizedTab)) score += 1_000;

  if (normalizedTab === 'stocks_etfs') {
    if (tags.some((tag: string) => tag === 'equity' || tag === 'stock' || tag === 'etf')) score += 80;
    if (canonicalId.startsWith('xyz:')) score += 40;
  } else if (normalizedTab === 'crypto') {
    if (tags.includes('crypto')) score += 50;
  } else if (normalizedTab === 'pre_ipo') {
    if (tags.includes('pre-ipo') || tags.includes('preipo')) score += 80;
  } else if (normalizedTab === 'indices') {
    if (tags.includes('index') || tags.includes('indices')) score += 80;
  } else if (normalizedTab === 'commodities') {
    if (tags.includes('commodity') || tags.includes('commodities')) score += 80;
  } else if (normalizedTab === 'themes') {
    if (tags.includes('theme') || tags.includes('themes')) score += 80;
  }

  return score;
};

type Candidate = {
  asset: any;
  upstreamTab: string;
  normalizedTab: string;
  score: number;
};

const preferCandidate = (left: Candidate, right: Candidate): Candidate => {
  if (left.score !== right.score) return left.score > right.score ? left : right;

  const leftCanonical = canonicalIdOf(left.asset);
  const rightCanonical = canonicalIdOf(right.asset);
  if (leftCanonical !== rightCanonical) return leftCanonical < rightCanonical ? left : right;

  const leftTab = `${left.normalizedTab}:${left.upstreamTab}`;
  const rightTab = `${right.normalizedTab}:${right.upstreamTab}`;
  return leftTab <= rightTab ? left : right;
};

export function normalizeHyperliquidMatrixTabs(payload: MatrixPayload): MatrixPayload {
  if (!payload?.tabs || Object.keys(payload.tabs).length === 0) return payload;

  const candidatesByCanonicalId = new Map<string, Candidate[]>();
  const passthrough: Candidate[] = [];
  let moved = 0;
  let deduplicated = 0;

  for (const [upstreamTab, tab] of Object.entries(payload.tabs)) {
    for (const asset of tab?.assets ?? []) {
      const canonicalId = canonicalIdOf(asset);
      const normalizedTab = normalizedTabFor(asset, upstreamTab);
      if (normalizedTab !== upstreamTab) moved += 1;

      const candidate: Candidate = {
        asset,
        upstreamTab,
        normalizedTab,
        score: evidenceScore(asset, upstreamTab, normalizedTab),
      };
      if (!canonicalId) {
        passthrough.push(candidate);
        continue;
      }
      const candidates = candidatesByCanonicalId.get(canonicalId) ?? [];
      candidates.push(candidate);
      candidatesByCanonicalId.set(canonicalId, candidates);
    }
  }

  const tabs: Record<string, MatrixTab> = {};
  for (const [key, tab] of Object.entries(payload.tabs)) {
    tabs[key] = { ...tab, assets: [], count: 0 };
  }

  const addCandidate = (candidate: Candidate) => {
    if (!tabs[candidate.normalizedTab]) {
      tabs[candidate.normalizedTab] = {
        label: candidate.normalizedTab,
        assets: [],
        count: 0,
      };
    }
    tabs[candidate.normalizedTab].assets!.push(candidate.asset);
  };

  passthrough.forEach(addCandidate);
  candidatesByCanonicalId.forEach((candidates) => {
    const preferred = candidates.reduce(preferCandidate);
    addCandidate(preferred);
    deduplicated += candidates.length - 1;
  });

  for (const tab of Object.values(tabs)) tab.count = tab.assets?.length ?? 0;

  const warnings = [...(payload.warnings ?? [])];
  if (moved > 0 || deduplicated > 0) {
    warnings.push(
      `App-server tab normalization moved ${moved} row(s) and removed ${deduplicated} duplicate canonical market row(s).`,
    );
  }

  const allAssetsCount = Object.values(tabs)
    .reduce((count, tab) => count + (tab.assets?.length ?? 0), 0);

  return { ...payload, tabs, all_assets_count: allAssetsCount, warnings };
}