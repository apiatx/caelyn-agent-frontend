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

// ── Discovery Capabilities ───────────────────────────────────────────────────

export interface PlaybookDiscoveryCapabilities {
  playbook_id?: string;
  supported_modes?: string[];
  giant_anchors?: string[];
  themes?: string[];
  supported_countries?: string[];
  supported_regions?: string[];
  depth_options?: number[];
  max_depth?: number;
  notes?: string[];
  [key: string]: unknown;
}

// ── Discovery Scores (per candidate) ────────────────────────────────────────

export interface DiscoveryScores {
  chain_depth_score?: number;
  bottleneck_criticality_score?: number;
  hiddenness_score?: number;
  supply_chain_confidence_score?: number;
  proxy_accessibility_score?: number;
  [key: string]: number | undefined;
}

// ── Discovery Candidate ──────────────────────────────────────────────────────

export interface DiscoveryCandidate {
  ticker?: string;
  symbol?: string;
  company_name?: string;
  name?: string;
  country?: string;
  exchange?: string;
  layer_depth?: number;
  chain_layer?: string;
  themes?: string[];
  theme_tags?: string[];
  giant_anchors?: string[];
  scores?: DiscoveryScores;
  // legacy flat fields the backend may also return
  bottleneck_score?: number;
  hiddenness_score?: number;
  confidence?: number;
  // richer ranking fields (optional — gracefully absent)
  best_blend_score?: number;
  visibility_bucket?: string;
  chain_role_type?: string;
  hiddenness_reason?: string;
  confidence_penalties?: string[];
  data_gaps?: string[];
  comparable_names?: string[];
  consensus_fit?: string;
  // "why this surfaced" narrative fields
  why_now?: string;
  why_hidden?: string;
  what_to_verify_next?: string;
  // narrative
  thesis_summary?: string;
  fit_reasoning?: string;
  rationale?: string;
  // coverage / access
  coverage_status?: string;
  data_confidence?: string;
  direct_tradable?: boolean;
  us_access_proxy?: string;
  adr_ticker?: string;
  adr_proxy?: string;
  etf_proxy?: string;
  // enrichment
  market_cap_usd?: number;
  price?: number;
  enriched?: boolean;
}

// ── Discovery Meta ───────────────────────────────────────────────────────────

export interface DiscoveryMeta {
  mode?: string;
  anchor?: string;
  themes?: string[];
  depth?: number;
  total_candidates?: number;
  [key: string]: unknown;
}

// ── Discovery Request / Response ─────────────────────────────────────────────

export interface PlaybookDiscoverRequest {
  playbook_id: string;
  mode?: string;
  // anchor / theme
  giant_anchors?: string[];
  anchor_ticker?: string;
  theme_ids?: string[];
  // filters
  country?: string;
  region?: string;
  include_foreign?: boolean;
  only_hidden?: boolean;
  // depth / pagination
  max_depth?: number;
  limit?: number;
  // proxy behavior
  include_adr_or_etf_proxies?: boolean;
  [key: string]: unknown;
}

export interface PlaybookDiscoverResponse {
  playbook_id?: string;
  mode?: string;
  summary?: string;
  analysis?: string;
  top_candidates?: DiscoveryCandidate[];
  candidates?: DiscoveryCandidate[];
  // optional ranked buckets — render first if present
  top_hidden_bottlenecks?: DiscoveryCandidate[];
  top_foreign_specialists?: DiscoveryCandidate[];
  top_us_accessible_foreign_proxies?: DiscoveryCandidate[];
  highest_confidence_candidates?: DiscoveryCandidate[];
  best_blend_candidates?: DiscoveryCandidate[];
  chain_map_preview?: unknown;
  meta?: DiscoveryMeta;
  error?: string;
  [key: string]: unknown;
}

// ── Compare / Consensus ──────────────────────────────────────────────────────

export interface PlaybookCompareRequest {
  tickers: string[];
  playbook_ids?: string[];        // defaults to ["serenity","sjcapital"] if omitted
  context_mode?: string;
  [key: string]: unknown;
}

export interface CompareResultRow {
  ticker?: string;
  company_name?: string;
  name?: string;
  serenity_score?: number;
  sj_score?: number;
  delta?: number;
  classification?: string;       // "Consensus" | "Serenity Only" | "S&J Only" | "Low Fit Both"
  explanation?: string;
  consensus_fit?: string;
  [key: string]: unknown;
}

export interface PlaybookCompareResponse {
  tickers?: string[];
  playbook_ids?: string[];
  results?: CompareResultRow[];
  summary?: string;
  consensus_tickers?: string[];
  serenity_only?: string[];
  sj_only?: string[];
  low_fit_both?: string[];
  error?: string;
  [key: string]: unknown;
}

// ── Supply-Chain Map ─────────────────────────────────────────────────────────

export interface ChainNode {
  ticker?: string;
  name?: string;
  company_name?: string;
  country?: string;
  exchange?: string;
  us_access_proxy?: string;
  adr_ticker?: string;
  adr_proxy?: string;
  etf_proxy?: string;
  bottleneck_score?: number;
  confidence?: number;
  is_foreign?: boolean;
  themes?: string[];
  [key: string]: unknown;
}

export interface ChainLayer {
  layer_index?: number;
  label?: string;
  nodes: ChainNode[];
}

export interface SupplyChainMapRequest {
  playbook_id: string;
  anchor?: string;
  giant?: string;
  theme?: string;
  region?: string;
  include_foreign?: boolean;
  max_depth?: number;
  [key: string]: unknown;
}

export interface SupplyChainMapResponse {
  playbook_id?: string;
  anchor?: string;
  anchor_type?: string;
  theme?: string;
  summary?: string;
  layers?: ChainLayer[];
  country_tags?: string[];
  adr_etf_proxies?: Record<string, string>;
  confidence?: number;
  meta?: DiscoveryMeta;
  // fallback flat fields
  nodes?: ChainNode[];
  error?: string;
  [key: string]: unknown;
}

// Legacy aliases used by older renderers — kept for backward compat
export type ChainMapNode = ChainNode;

export interface ChainMapEdge {
  from?: string;
  to?: string;
  relationship?: string;
  strength?: number;
}

export interface ForeignCoverageInfo {
  country?: string;
  exchange?: string;
  adr?: string;
  etf_proxy?: string;
  coverage_status?: string;
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
  answer?: string;
  top_fits?: PlaybookAnalyzeIdea[];
  low_fits?: PlaybookAnalyzeIdea[];
  rejected?: PlaybookAnalyzeIdea[];
  reasoning?: string;
  // Serenity analyze-with-discovery context
  discovery_used?: boolean;
  discovery_mode?: string;
  discovery_context?: unknown;
  top_ranked?: DiscoveryCandidate[];
  error?: string;
  [key: string]: unknown;
}
