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
