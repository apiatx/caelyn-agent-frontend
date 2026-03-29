export interface TickerItem {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

export interface SectorPerformance {
  ticker: string;
  name: string;
  changePct: number;
  score: number;
  direction: 'up' | 'down' | 'flat';
}

export interface PillarScore {
  score: number;
  weight: number;
  direction: 'up' | 'down' | 'flat';
  interpretation: 'healthy' | 'weakening' | 'risk-off';
  label: string;
}

export interface TradingDashboardData {
  decision: 'YES' | 'CAUTION' | 'NO';
  marketQualityScore: number;
  executionWindowScore: number;
  mode: 'swing' | 'day';

  pillars: {
    volatility: PillarScore;
    trend: PillarScore;
    breadth: PillarScore;
    momentum: PillarScore;
    macro: PillarScore;
  };

  ticker: {
    spy: TickerItem;
    qqq: TickerItem;
    vix: TickerItem;
    dxy: TickerItem;
    tnx: TickerItem;
    sectors: TickerItem[];
  };

  volatility: {
    vix: { value: number; trend5d: number; percentile1yr: number };
    vvix: number | null;
    interpretation: 'healthy' | 'elevated' | 'extreme';
    direction: 'up' | 'down' | 'flat';
    score: number;
  };

  trend: {
    spy: { price: number; ma20: number; ma50: number; ma200: number };
    qqq: { price: number; ma50: number };
    rsi14: number;
    regime: 'uptrend' | 'downtrend' | 'chop';
    direction: 'up' | 'down' | 'flat';
    interpretation: 'healthy' | 'weakening' | 'risk-off';
    score: number;
  };

  breadth: {
    pctAbove20d: number;
    pctAbove50d: number;
    pctAbove200d: number;
    nyseAdvDecRatio: number;
    nasdaqNewHighs: number;
    nasdaqNewLows: number;
    mcclellan: number | null;
    direction: 'up' | 'down' | 'flat';
    interpretation: 'healthy' | 'weakening' | 'risk-off';
    score: number;
  };

  momentum: {
    sectors: SectorPerformance[];
    leaderCount: number;
    laggardCount: number;
    direction: 'up' | 'down' | 'flat';
    interpretation: 'healthy' | 'weakening' | 'risk-off';
    score: number;
  };

  macro: {
    tnx: { value: number; trend: 'up' | 'down' | 'flat' };
    dxy: { value: number; trend: 'up' | 'down' | 'flat' };
    fedStance: 'hawkish' | 'neutral' | 'dovish';
    fomcWithin72h: boolean;
    fomcEventDate: string | null;
    cpiFlag: boolean;
    jobsFlag: boolean;
    direction: 'up' | 'down' | 'flat';
    interpretation: 'healthy' | 'weakening' | 'risk-off';
    score: number;
  };

  executionWindow: {
    breakoutsHolding: boolean;
    leadersGainingPostBreakout: boolean;
    pullbacksBought: boolean;
    multiDayFollowThrough: boolean;
    score: number;
  };

  alerts: Array<{ type: 'fomc' | 'cpi' | 'jobs' | 'vix' | 'general'; message: string; severity: 'warning' | 'danger' | 'info' }>;
  terminalAnalysis: string;
  lastUpdated: string;
  status: 'LIVE' | 'UPDATING' | 'STALE';
}

let cachedData: { data: TradingDashboardData; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000;

function computeDecision(mqs: number): 'YES' | 'CAUTION' | 'NO' {
  if (mqs >= 80) return 'YES';
  if (mqs >= 60) return 'CAUTION';
  return 'NO';
}

function generatePlaceholderData(mode: 'swing' | 'day' = 'swing'): TradingDashboardData {
  const volatilityScore = 72;
  const trendScore = 65;
  const breadthScore = 58;
  const momentumScore = 70;
  const macroScore = 55;

  const marketQualityScore = Math.round(
    volatilityScore * 0.25 +
    trendScore * 0.20 +
    breadthScore * 0.20 +
    momentumScore * 0.25 +
    macroScore * 0.10
  );

  const executionScore = 68;

  const sectors: SectorPerformance[] = [
    { ticker: 'XLK', name: 'Technology', changePct: 1.2, score: 78, direction: 'up' },
    { ticker: 'XLV', name: 'Health Care', changePct: 0.4, score: 60, direction: 'up' },
    { ticker: 'XLF', name: 'Financials', changePct: -0.3, score: 48, direction: 'down' },
    { ticker: 'XLE', name: 'Energy', changePct: -1.1, score: 35, direction: 'down' },
    { ticker: 'XLI', name: 'Industrials', changePct: 0.2, score: 55, direction: 'flat' },
    { ticker: 'XLU', name: 'Utilities', changePct: -0.6, score: 42, direction: 'down' },
    { ticker: 'XLB', name: 'Materials', changePct: 0.8, score: 65, direction: 'up' },
    { ticker: 'XLP', name: 'Cons. Staples', changePct: 0.1, score: 52, direction: 'flat' },
    { ticker: 'XLY', name: 'Cons. Disc.', changePct: 1.5, score: 80, direction: 'up' },
    { ticker: 'XLC', name: 'Comm. Svcs', changePct: 0.9, score: 72, direction: 'up' },
    { ticker: 'XLRE', name: 'Real Estate', changePct: -0.4, score: 45, direction: 'down' },
  ];

  const leaderCount = sectors.filter(s => s.score >= 65).length;
  const laggardCount = sectors.filter(s => s.score < 45).length;

  return {
    decision: computeDecision(marketQualityScore),
    marketQualityScore,
    executionWindowScore: executionScore,
    mode,

    pillars: {
      volatility: { score: volatilityScore, weight: 25, direction: 'down', interpretation: 'healthy', label: 'Volatility / Risk' },
      trend: { score: trendScore, weight: 20, direction: 'up', interpretation: 'healthy', label: 'Trend & Structure' },
      breadth: { score: breadthScore, weight: 20, direction: 'down', interpretation: 'weakening', label: 'Market Breadth' },
      momentum: { score: momentumScore, weight: 25, direction: 'up', interpretation: 'healthy', label: 'Momentum' },
      macro: { score: macroScore, weight: 10, direction: 'flat', interpretation: 'weakening', label: 'Macro / Liquidity' },
    },

    ticker: {
      spy: { symbol: 'SPY', price: 548.32, change: 3.12, changePct: 0.57 },
      qqq: { symbol: 'QQQ', price: 462.18, change: 4.21, changePct: 0.92 },
      vix: { symbol: 'VIX', price: 18.42, change: -0.84, changePct: -4.36 },
      dxy: { symbol: 'DXY', price: 103.72, change: -0.28, changePct: -0.27 },
      tnx: { symbol: 'TNX', price: 4.28, change: 0.03, changePct: 0.71 },
      sectors: sectors.map(s => ({ symbol: s.ticker, price: 0, change: 0, changePct: s.changePct })),
    },

    volatility: {
      vix: { value: 18.42, trend5d: -2.1, percentile1yr: 38 },
      vvix: 96.4,
      interpretation: 'healthy',
      direction: 'down',
      score: volatilityScore,
    },

    trend: {
      spy: { price: 548.32, ma20: 541.0, ma50: 532.5, ma200: 510.2 },
      qqq: { price: 462.18, ma50: 448.3 },
      rsi14: 58.4,
      regime: 'uptrend',
      direction: 'up',
      interpretation: 'healthy',
      score: trendScore,
    },

    breadth: {
      pctAbove20d: 54,
      pctAbove50d: 48,
      pctAbove200d: 61,
      nyseAdvDecRatio: 1.32,
      nasdaqNewHighs: 112,
      nasdaqNewLows: 43,
      mcclellan: 18.4,
      direction: 'down',
      interpretation: 'weakening',
      score: breadthScore,
    },

    momentum: {
      sectors,
      leaderCount,
      laggardCount,
      direction: 'up',
      interpretation: 'healthy',
      score: momentumScore,
    },

    macro: {
      tnx: { value: 4.28, trend: 'up' },
      dxy: { value: 103.72, trend: 'down' },
      fedStance: 'neutral',
      fomcWithin72h: false,
      fomcEventDate: '2026-04-29',
      cpiFlag: false,
      jobsFlag: false,
      direction: 'flat',
      interpretation: 'weakening',
      score: macroScore,
    },

    executionWindow: {
      breakoutsHolding: true,
      leadersGainingPostBreakout: true,
      pullbacksBought: false,
      multiDayFollowThrough: true,
      score: executionScore,
    },

    alerts: [],
    terminalAnalysis:
      'Market environment is constructive for swing trading. SPY is trending above all key moving averages with RSI in healthy mid-range territory. Breadth has moderated — only 48% of stocks above 50-day, signaling selectivity is key. Technology and Consumer Discretionary are leading, while Energy and Real Estate lag. VIX at 18.4 (38th percentile) indicates manageable risk. Fed stance is neutral with next FOMC on April 29. Focus on A+ setups in leading sectors with tight stops. Reduce size on breadth weakness. CAUTION warranted until breadth confirms.',
    lastUpdated: new Date().toISOString(),
    status: 'LIVE',
  };
}

export const shouldIBeTradingService = {
  async getDashboard(mode: 'swing' | 'day' = 'swing'): Promise<TradingDashboardData> {
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return { ...cachedData.data, mode };
    }

    const data = generatePlaceholderData(mode);
    cachedData = { data, timestamp: Date.now() };
    return data;
  },

  invalidateCache() {
    cachedData = null;
  },
};
