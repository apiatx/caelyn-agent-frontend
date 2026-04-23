// Types for the /api/home/dashboard aggregator payload.
// Kept loose (nullable) because the backend returns partial data on section
// failure — the UI degrades gracefully per section.

export type HomeMarketStatus =
  | "open"
  | "pre_market"
  | "after_hours"
  | "closed";

export interface HomeGreeting {
  text: string;
  market: {
    status: HomeMarketStatus;
    label: string;
    now_et?: string | null;
  };
}

export interface HomeTickerStripItem {
  symbol: string;
  price: number | null;
  change_pct: number | null;
  asset_class: "equity" | "rate" | "volatility" | "fx" | "commodity" | string;
}

export interface HomeMacroCard {
  label: string;
  symbol: string;
  price: number | null;
  change_pct: number | null;
  kind: "equity" | "rate" | "volatility" | "fx" | "commodity" | string;
  note?: string | null;
}

export interface HomeHighlightedCompany {
  symbol:        string;
  current_price: number | null;
  change_1d_pct: number | null;
  volume_vs_avg: number | null;
  options_signal?: string | null;
  rsi?:          number | null;
  signal_label?: string | null;
}

export interface HomeSubThemeItem {
  sub_theme:      string;
  avg_change_1d:  number | null;
  avg_change_7d:  number | null;
  leader_symbols: string[];
  leader_count:   number;
  breadth_score:  number | null;
  momentum_score: number | null;
  pattern_summary?: string | null;
}

export interface HomeThemePerformanceItem {
  name: string | null;
  ticker: string | null;
  rotation_score: number | null;
  relative_strength_rank?: number | null;
  // Actual SectorSnapshot schema fields returned by the backend
  change_1d: number | null;
  change_7d: number | null;
  change_30d: number | null;
  change_ytd?: number | null;
  regime_tag: string | null;
}

export interface HomeThemePerformance {
  themes: HomeThemePerformanceItem[];
  regime: Record<string, unknown> | null;
  updated_at: string | null;
  leaders?: Array<Record<string, unknown>>;
  laggards?: Array<Record<string, unknown>>;
}

// Trending Ideas — sourced from Stocktwits trending feed
export interface HomeTrendingIdea {
  ticker: string;
  title: string;
  watchlist_count: number | null;
  source: "stocktwits" | string;
}

export interface HomeMoverRow {
  ticker: string | null;
  company: string;
  price: string | number | null;
  change_pct: number | null;
  change_label: string;
  direction: "up" | "down";
}

export interface HomeMovers {
  gainers: HomeMoverRow[];
  losers: HomeMoverRow[];
}

// Trending on X — weekly cached consensus from select trader accounts
export interface HomeTrendingOnXTicker {
  symbol: string;
  mentions: number | null;
  sentiment: string | null;
  rationale: string;
  accounts?: string[];
}

export interface HomeTrendingOnX {
  generated_at: string | null;
  top_tickers: HomeTrendingOnXTicker[];
  key_themes: string[];
  notable_accounts: string[];
  is_stale: boolean;
  age_seconds?: number | null;
  refresh_in_progress: boolean;
  available: boolean;
}

export interface HomeFearGreedSide {
  score: number | null;
  rating: string | null;
  signal?: string | null;
  historical?: Record<string, unknown> | null;
}

export interface HomeFearGreed {
  equities: HomeFearGreedSide | null;
  crypto: HomeFearGreedSide | null;
}

export interface HomeSectionStatus {
  macro?:                  string;
  sector?:                 string;
  movers?:                 string;
  fear_greed?:             string;
  trending?:               string;
  trending_on_x?:          string;
  news?:                   string;
  crypto_fg?:              string;
  latest_news?:            string;
  portfolio_snapshot?:     string;
  watchlist_snapshot?:     string;
  unusual_options_flows?:  string;
  highlighted_companies?:  string;
  sub_theme_performance?:  string;
}

// News articles folded into the Home composed payload (Node-side, reuses NEWS_CACHE)
// Shape matches getHomeNewsArticles() in server/routes.ts
export interface HomeNewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  published: string;
  image?: string | null;
}

export interface HomeNewsSection {
  articles: HomeNewsArticle[];
  source: string;
  count: number;
}

// Latest news — backend-provided via FMP market news
export interface HomeLatestNewsItem {
  headline:     string;
  summary:      string | null;
  url:          string;
  published_at: string | null;
  source:       string | null;
  symbol?:      string | null;
}

// Portfolio / Watchlist snapshot items
export interface HomeSnapshotItem {
  symbol:         string;
  current_price:  number | null;
  change_1d_pct:  number | null;
  volume_vs_avg:  number | null;
  options_signal?: string | null;
  asset_type?:    string | null;
  rsi?:           number | null;
  signal_label?:  string | null;
}

// Unusual options flows — populated after 30-min precompute warms
export interface HomeUnusualOptionsFlowItem {
  symbol:           string;
  composite_score?: number | null;
  signal?:          string | null;
  rationale?:       string | null;
  [key: string]:    any;
}

export interface HomeDashboardPayload {
  generated_at:             string;
  greeting:                 HomeGreeting;
  ticker_strip:             HomeTickerStripItem[];
  macro_cards:              HomeMacroCard[];
  highlighted_companies:    HomeHighlightedCompany[];
  theme_performance:        HomeThemePerformance;
  sub_theme_performance?:   HomeSubThemeItem[];
  trending_ideas:           HomeTrendingIdea[];
  movers:                   HomeMovers;
  trending_on_x:            HomeTrendingOnX;
  fear_greed:               HomeFearGreed;
  news?:                    HomeNewsSection;
  latest_news?:             HomeLatestNewsItem[];
  portfolio_snapshot?:      HomeSnapshotItem[];
  watchlist_snapshot?:      HomeSnapshotItem[];
  unusual_options_flows?:   HomeUnusualOptionsFlowItem[];
  section_status:           HomeSectionStatus;
  timing?:                  { total_seconds: number };
  from_cache?:              boolean;
}
