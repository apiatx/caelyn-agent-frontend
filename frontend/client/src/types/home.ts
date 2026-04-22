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
  ticker: string;
  source: string;
}

export interface HomeThemePerformanceItem {
  name: string | null;
  ticker: string | null;
  rotation_score: number | null;
  change_1d: number | null;
  change_5d: number | null;
  change_1m: number | null;
  regime_tag: string | null;
}

export interface HomeThemePerformance {
  themes: HomeThemePerformanceItem[];
  regime: Record<string, unknown> | null;
  updated_at: string | null;
  leaders?: Array<Record<string, unknown>>;
  laggards?: Array<Record<string, unknown>>;
}

export interface HomeTrendingDashboard {
  id: string | null;
  name: string;
  kind: string;
  ticker_count: number;
  updated_at?: string | null;
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

export interface HomeTrendingResearchItem {
  kind: string;
  title: string | null;
  summary: string | null;
  source: string;
  id?: string | null;
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
  macro?: string;
  sector?: string;
  movers?: string;
  fear_greed?: string;
  trending?: string;
}

export interface HomeDashboardPayload {
  generated_at: string;
  greeting: HomeGreeting;
  ticker_strip: HomeTickerStripItem[];
  macro_cards: HomeMacroCard[];
  highlighted_companies: HomeHighlightedCompany[];
  theme_performance: HomeThemePerformance;
  trending_dashboards: HomeTrendingDashboard[];
  movers: HomeMovers;
  trending_research: HomeTrendingResearchItem[];
  fear_greed: HomeFearGreed;
  section_status: HomeSectionStatus;
  timing?: { total_seconds: number };
  from_cache?: boolean;
}
