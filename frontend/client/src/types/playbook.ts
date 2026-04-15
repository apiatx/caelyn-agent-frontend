export interface PlaybookSummary {
  id: string;
  name: string;
  short_label: string;
  description: string;
  enabled: boolean;
  version: string;
  ui_color?: string;
  preferred_sectors?: string[];
  preferred_themes?: string[];
  entry_style?: string;
  exit_style?: string;
  positioning_style?: string;
}

export interface PlaybookFactorScores {
  [factor: string]: number;
}

export interface PlaybookScoreResult {
  ticker: string;
  playbook_id: string;
  final_score: number;
  hard_filter_pass: boolean;
  hard_filter_failures: string[];
  summary_label: string;
  factor_scores: PlaybookFactorScores;
  penalties_applied: Record<string, number>;
  matched_rules: string[];
  risks: string[];
  stub_factors: string[];
}

export interface WatchlistPlaybookResponse {
  playbook_id: string;
  count: number;
  results: PlaybookScoreResult[];
}

export interface PortfolioPlaybookResponse {
  playbook_id: string;
  aggregate_score: number;
  holdings: PlaybookScoreResult[];
}

export type StrategyId = "default" | string;

export interface StrategyOption {
  id: StrategyId;
  label: string;
  color?: string;
  description?: string;
}

export const STRATEGY_FIT_LABEL = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: "High Fit", color: "#10b981" };
  if (score >= 60) return { label: "Moderate Fit", color: "#f59e0b" };
  return { label: "Low Fit", color: "#ef4444" };
};

// ── Discovery / Supply-Chain ────────────────────────────────────────────────

export interface PlaybookDiscoverRequest {
  playbook_id: string;
  mode?: "giant_chain" | "theme_scan" | string;
  anchor_ticker?: string;
  theme?: string;
  theme_ids?: string[];
  region?: string;
  hidden_only?: boolean;
  depth?: number;
  include_foreign?: boolean;
  include_proxies?: boolean;
  [key: string]: any;
}

export interface ForeignCoverageInfo {
  country?: string;
  exchange?: string;
  adr?: string;
  etf_proxy?: string;
  coverage_status?: string;
}

export interface DiscoveryCandidate {
  ticker?: string;
  name?: string;
  country?: string;
  exchange?: string;
  chain_layer?: string;
  theme_tags?: string[];
  bottleneck_score?: number;
  hiddenness_score?: number;
  confidence?: number;
  rationale?: string;
  foreign_coverage?: ForeignCoverageInfo;
  adr_proxy?: string;
  etf_proxy?: string;
}

export interface PlaybookDiscoverResponse {
  playbook_id: string;
  mode?: string;
  summary?: string;
  analysis?: string;
  candidates?: DiscoveryCandidate[];
  top_candidates?: DiscoveryCandidate[];
  error?: string;
  [key: string]: any;
}

export interface ChainMapNode {
  ticker?: string;
  name?: string;
  layer?: string;
  country?: string;
  theme_tags?: string[];
  confidence?: number;
  is_foreign?: boolean;
  adr_proxy?: string;
}

export interface ChainMapEdge {
  from?: string;
  to?: string;
  relationship?: string;
  strength?: number;
}

export interface SupplyChainMapRequest {
  playbook_id: string;
  anchor?: string;
  theme?: string;
  region?: string;
  depth?: number;
  include_foreign?: boolean;
  [key: string]: any;
}

export interface SupplyChainMapResponse {
  playbook_id: string;
  anchor?: string;
  theme?: string;
  summary?: string;
  layers?: { label: string; nodes: ChainMapNode[] }[];
  nodes?: ChainMapNode[];
  edges?: ChainMapEdge[];
  error?: string;
  [key: string]: any;
}

// ── Analyze ──────────────────────────────────────────────────────────────────

export interface PlaybookAnalyzeRequest {
  playbook_id: string;
  query: string;
  context_mode?: "watchlist" | "portfolio" | "custom" | "universe";
  tickers?: string[];
  holdings?: { ticker: string; weight?: number }[];
  limit?: number;
  include_breakdown?: boolean;
}

export interface PlaybookAnalyzeIdea {
  ticker?: string;
  symbol?: string;
  name?: string;
  score?: number;
  final_score?: number;
  rationale?: string;
  thesis?: string;
  reason?: string;
  risks?: string[];
}

export interface PlaybookAnalyzeResponse {
  playbook_id: string;
  analysis?: string;
  summary?: string;
  message?: string;
  top_fits?: PlaybookAnalyzeIdea[];
  low_fits?: PlaybookAnalyzeIdea[];
  rejected?: PlaybookAnalyzeIdea[];
  reasoning?: string;
  error?: string;
  [key: string]: any;
}
