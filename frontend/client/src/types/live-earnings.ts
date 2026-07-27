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

export type ResultsStatus = 'reported' | 'pending' | 'scheduled' | string | null;
export type ReactionStatus = 'reaction_pending' | 'available' | 'completed' | string | null;
export type MaterialsStatus = 'materials_pending' | 'available' | 'completed' | string | null;

export interface EarningsStatuses {
  results_status?: ResultsStatus;
  reaction_status?: ReactionStatus;
  materials_status?: MaterialsStatus;
}

/** Backend status fields are authoritative; individual data values are not status signals. */
export function earningsStatusView(statuses: EarningsStatuses | null | undefined) {
  return {
    resultsReported: statuses?.results_status === 'reported',
    reactionPending: statuses?.reaction_status === 'reaction_pending',
    materialsPending: statuses?.materials_status === 'materials_pending',
  };
}

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

export interface LiveResultsPayload extends LiveResultsSummary {
  date?: string | null;
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
  company_name?: string | null;
  state: LiveEarningsState;
  results_status?: ResultsStatus;
  reaction_status?: ReactionStatus;
  materials_status?: MaterialsStatus;
  classification: LiveEarningsClassification | null;
  revision: number;
  detected_at: string | null;
  updated_at: string;

  expected_date: string | null;
  expected_at?: string | null;
  expected_time_local?: string | null;
  expected_timezone?: string | null;
  expected_timing: string | null;
  report_time_status?: 'confirmed' | 'estimated' | string | null;
  report_period?: string | null;
  schedule_source?: string | null;

  fiscal_period: string | null;
  fiscal_year: number | null;

  is_dry_run?: boolean;
  is_read?: boolean | null;
  read_at?: string | null;
  preliminary?: boolean;

  results_payload?: LiveResultsPayload | null;
  filing_payload?: LiveFilingSummary | null;
  reaction_payload?: LiveMarketReaction | null;

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
