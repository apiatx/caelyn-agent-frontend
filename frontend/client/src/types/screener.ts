// ── Strategy Screener Types ───────────────────────────────────────────────────

export interface ScreenerConfig {
  playbook_id?: string;
  cadence?: string;
  cadence_label?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ScreenerEntry {
  rank?: number;
  ticker?: string;
  symbol?: string;
  company_name?: string;
  name?: string;
  role?: string;
  chain_role_type?: string;
  theme?: string;
  themes?: string[];
  theme_tags?: string[];
  market_cap_usd?: number;
  layer_depth?: number;
  chain_layer?: string;
  country?: string;
  exchange?: string;
  market?: string;
  grade?: string;
  score?: number;
  final_score?: number;
  best_blend_score?: number;
  bottleneck_score?: number;
  hiddenness_score?: number;
  confidence?: string | number;
  visibility_bucket?: string;
  direct_tradable?: boolean;
  us_access_proxy?: string;
  adr_ticker?: string;
  adr_proxy?: string;
  etf_proxy?: string;
  why_now?: string;
  why_hidden?: string;
  thesis_summary?: string;
  [key: string]: unknown;
}

export interface ScreenerSnapshot {
  snapshot_id?: string;
  id?: string;
  generated_at?: string;
  created_at?: string;
  cadence?: string;
  cadence_label?: string;
  playbook_id?: string;
  summary?: string;
  regime_label?: string;
  regime_summary?: string;
  top_themes?: string[];
  total_candidates?: number;
  entries?: ScreenerEntry[];
  ranked_list?: ScreenerEntry[];
  candidates?: ScreenerEntry[];
  results?: ScreenerEntry[];
  error?: string;
  [key: string]: unknown;
}

export interface ScreenerReportSection {
  label?: string;
  content?: string;
  text?: string;
  [key: string]: unknown;
}

export interface ScreenerReport {
  ticker?: string;
  symbol?: string;
  snapshot_id?: string;
  company_name?: string;
  name?: string;
  headline?: string;
  summary?: string;
  why_it_matters?: string;
  why_hidden?: string;
  supply_chain_position?: string;
  supply_chain_map?: string;
  competitors?: string;
  catalysts?: string;
  rerating_case?: string;
  key_risk?: string;
  what_to_verify_next?: string;
  what_would_break_thesis?: string;
  meta?: ScreenerEntry;
  sections?: ScreenerReportSection[];
  error?: string;
  [key: string]: unknown;
}

export interface ScreenerRefreshResponse {
  status?: string;
  message?: string;
  snapshot_id?: string;
  error?: string;
  [key: string]: unknown;
}
