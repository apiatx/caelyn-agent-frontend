export type LiveEarningsState =
  | 'scheduled'
  | 'monitoring'
  | 'filing_detected'
  | 'results_partial'
  | 'results_available'
  | 'results_updated'
  | 'complete';

export type LiveEarningsClassification =
  | 'double_beat'
  | 'double_miss'
  | 'mixed'
  | 'partial'
  | 'unclassified';

export interface LiveResultsSummary {
  eps_actual: number | null;
  eps_estimate: number | null;
  eps_surprise_amount: number | null;
  eps_surprise_pct: number | null;
  revenue_actual: number | null;
  revenue_estimate: number | null;
  revenue_surprise_amount: number | null;
  revenue_surprise_pct: number | null;
}

export interface LiveFilingSummary {
  form: string | null;
  url: string | null;
  index_url?: string | null;
  sec_accepted_at: string | null;
}

export interface LiveMarketReaction {
  move_pct: number | null;
  price: number | null;
  timestamp: string | null;
  session: 'premarket' | 'regular' | 'afterhours' | null;
  is_preliminary: boolean;
  source?: string | null;
}

export interface LiveSourceStatus {
  fmp_checked_at: string | null;
  sec_checked_at: string | null;
}

export interface LiveEarningsEvent {
  event_id: string;
  event_key: string;
  symbol: string;
  state: LiveEarningsState;
  expected_date: string | null;
  expected_timing: string | null;
  fiscal_period: string | null;
  fiscal_year: number | null;
  detected_at: string | null;
  updated_at: string;
  revision: number;
  is_dry_run?: boolean;
  classification: LiveEarningsClassification | null;
  read_at: string | null;
  preliminary?: boolean;
  results_summary: LiveResultsSummary | null;
  filing_summary: LiveFilingSummary | null;
  initial_market_reaction: LiveMarketReaction | null;
  source_status?: LiveSourceStatus | null;
}

export interface LiveEventsFeedResponse {
  events: LiveEarningsEvent[];
}

export interface LiveEventAckResponse {
  success: boolean;
  event_id: string;
  read_at: string | null;
}
