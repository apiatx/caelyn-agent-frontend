import { useState, useCallback, useMemo, useRef, Component } from 'react';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { useSetScreenContext } from '@/hooks/useSetScreenContext';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Search, RefreshCw, Bot, X, ChevronDown, ChevronUp,
  ChevronsUpDown, AlertTriangle, Pin, BarChart2, Target,
  TrendingUp, TrendingDown, Eye, ShieldAlert, Zap,
} from 'lucide-react';

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Prevents a crash inside a signal card / panel from blanking the whole page.
class SectionErrorBoundary extends Component<
  { children: ReactNode; label: string },
  { caught: boolean }
> {
  constructor(props: any) { super(props); this.state = { caught: false }; }
  static getDerivedStateFromError() { return { caught: true }; }
  render() {
    if (this.state.caught) {
      return (
        <div style={{ padding: '12px 14px', fontSize: 9, color: '#64748b', textAlign: 'center' }}>
          {this.props.label} data unavailable — will retry next refresh
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:      '#080c13',
  card:    '#0d1623',
  card2:   '#0a1020',
  hero:    '#080e1a',
  border:  '#1a2540',
  text:    '#e2e8f0',
  dim:     '#64748b',
  dimLow:  '#1e2d40',
  teal:    '#0ea5e9',
  green:   '#22c55e',
  red:     '#ef4444',
  amber:   '#f59e0b',
  purple:  '#a855f7',
  blue:    '#3b82f6',
  cyan:    '#06b6d4',
  gold:    '#fbbf24',
  silver:  '#94a3b8',
  font:    "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
};

// ─── Base Types ───────────────────────────────────────────────────────────────
export interface ScreenerRow {
  rank:              number;
  coin:              string;
  displayName:       string;
  marketType:        'perp' | 'spot';
  category:          string;
  tags:              string[];
  markPrice:         number | null;
  midPrice:          number | null;
  oraclePrice:       number | null;
  bboBid:            number | null;
  bboAsk:            number | null;
  spread:            number | null;
  spreadPct:         number | null;
  spreadBps:         number | null;
  change24hPct:      number | null;
  premium:           number | null;
  funding:           number | null;
  predictedFunding:  number | null;
  openInterest:      number | null;
  oiChangePct:       number | null;
  oiChange5m:        number | null;
  oiChange1h:        number | null;
  volume24h:         number | null;
  volume24hBase:     number | null;
  volumeImpulse:     number | null;
  tradeCount:        number | null;
  tradeImbalance:    number | null;
  bidDepth:          number | null;
  askDepth:          number | null;
  bidAskImbalance:   number | null;
  impactBidPx:       number | null;
  impactAskPx:       number | null;
  distMarkOracle:    number | null;
  distMarkMid:       number | null;
  distMarkPrevDay:   number | null;
  volatility:        number | null;
  momentum:          number | null;
  breakoutScore:     number | null;
  meanReversionScore:number | null;
  liquidityScore:    number | null;
  flowScore:         number | null;
  compositeSignal:   number | null;
  signalDirection:   'bullish' | 'bearish' | 'neutral' | null;
  signalConfidence:  number | null;
  maxLeverage:       number | null;
  szDecimals:        number | null;
  marketStatus:      string | null;
  updatedAt:         string | null;
  agentRank:         number | null;
  agentScore:        number | null;
  agentRationale:    string | null;
  rankDelta:         number | null;
}

export interface ScreenerMeta {
  totalAssets:       number;
  gainers:           number;
  losers:            number;
  topMover:          string | null;
  topMoverPct:       number | null;
  largestVolumeCoin: string | null;
  largestVolume:     number | null;
  largestOICoin:     string | null;
  largestOI:         number | null;
  highestFunding:    number | null;
  highestFundingCoin:string | null;
  lowestFunding:     number | null;
  lowestFundingCoin: string | null;
  lastUpdated:       string | null;
  serverTs:          string | null;
}

// ─── Agent Briefing Types (rich payload) ─────────────────────────────────────
// Each coin in a guidance bucket
export interface GuidanceCoin {
  coin:   string;
  reason: string | null;
  score:  number | null;
}

// A full actionable idea with reasons, watch list, invalidation
export interface BriefingIdea {
  coin:              string;
  side:              'long' | 'short' | 'watch' | 'avoid';
  setupType:         string | null;
  score:             number;
  confidence:        number;
  thesisTitle:       string | null;
  thesisSummary:     string | null;
  reasons:           string[] | null;
  whatToWatch:       string[] | null;
  invalidationNotes: string[] | null;
  rankMovement:      number | null;
  metrics:           Record<string, number | null> | null;
}

// Full agent briefing — returned by POST /api/hyperliquid/agent-rank
export interface AgentBriefing {
  marketRegime:        string | null;
  updatedAt:           string;
  bestLong:            BriefingIdea | null;
  bestShort:           BriefingIdea | null;
  bestBreakoutWatch:   BriefingIdea | null;
  bestExhaustionWatch: BriefingIdea | null;
  actionableIdeas:     BriefingIdea[];
  guidance: {
    tradeNow:      GuidanceCoin[];
    watchBreakout: GuidanceCoin[];
    watchCollapse: GuidanceCoin[];
    avoid:         GuidanceCoin[];
  };
}

// Legacy ranked item (still supported for backward compat)
export interface AgentRankedItem {
  coin:          string;
  agentRank:     number;
  agentScore:    number;
  direction:     'long' | 'short' | 'avoid' | 'neutral';
  setupType:     'breakout' | 'mean_reversion' | 'trend_continuation' | 'crowding_unwind' | 'avoid' | 'neutral' | null;
  confidence:    number;
  rationale:     string;
  thesis:        string | null;
  riskNote:      string | null;
  rankMovement:  number | null;
  featureContributions?: Record<string, number>;
}

// Agent result — briefing is the richer optional payload
export interface AgentResult {
  rankedCoins:    AgentRankedItem[];
  longs:          AgentRankedItem[];
  shorts:         AgentRankedItem[];
  breakouts:      AgentRankedItem[];
  meanReversions: AgentRankedItem[];
  avoid:          AgentRankedItem[];
  summary:        string;
  generatedAt:    string;
  briefing?:      AgentBriefing;
  // LLM-generated analysis + macro context
  llmAnalysis?:   string;
  fearGreed?:     { value: string; value_classification: string; timestamp?: string };
}

// Asset detail (unchanged)
export interface AssetDetail {
  coin:            string;
  priceHistory:    { t: number; p: number }[];
  orderBook:       { bids: [number, number][]; asks: [number, number][] };
  recentTrades:    { t: number; p: number; sz: number; side: 'B' | 'S' }[];
  momentumSummary: string | null;
  liquiditySummary:string | null;
  marketStructure: string | null;
  agentRationale:  string | null;
  scoreHistory:    { t: number; score: number }[];
}

// ─── Section Tooltip Descriptions ────────────────────────────────────────────
const SECTION_TOOLTIPS: Record<string, { short: string; why: string; how: string }> = {
  'Top Gainers':      { short: 'Strongest 24h price movers.', why: 'Shows which markets had the biggest upside move over the last day. Useful for spotting momentum leaders, but strong gains alone do not confirm sustainability.', how: 'Higher positive % means stronger recent upside performance. Best used with volume, OI, and funding context.' },
  'Top Losers':       { short: 'Sharpest 24h price declines.', why: 'Helps surface the weakest markets, flushes, or names that may be in capitulation. Can also highlight bounce candidates, but weakness can persist.', how: 'More negative % means heavier recent downside pressure. Check whether the move is trend continuation or exhaustion.' },
  'High Funding':     { short: 'Longs paying elevated funding.', why: 'Highlights crowded long positioning and potential squeeze or reversal risk if the trade becomes too consensus.', how: 'Higher positive funding means longs are paying shorts more aggressively. Extreme readings can signal overheating.' },
  'Neg Funding':      { short: 'Shorts paying elevated funding.', why: 'Highlights crowded short positioning and potential flush risk if shorts get trapped.', how: 'More negative funding means shorts are paying longs. Extreme negative funding can set up squeezes.' },
  'OI Leaders':       { short: 'Largest open interest by USD.', why: 'Shows where the most positioning sits. High OI often means deeper participation, but also bigger crowding and liquidation potential.', how: 'Larger OI means more capital is tied up in that market. Watch whether OI is rising with price or against it.' },
  'Volume Leaders':   { short: 'Largest 24h notional trading volume.', why: 'Shows where the tape is most active. High volume often confirms attention and tradability.', how: 'Higher volume means heavier recent participation. Strong moves on strong volume usually matter more than moves on thin volume.' },
  'Breakout Watch':   { short: 'Highest breakout readiness score.', why: 'Surfaces markets that may be setting up for a decisive move rather than simply reacting after the fact.', how: 'Higher score means the market is showing stronger breakout conditions based on the dashboard\'s internal signal logic.' },
  'Mark/Oracle Gap':  { short: 'Mark price dislocation vs oracle.', why: 'Helps identify when the traded market is stretching away from fair reference pricing, which can signal imbalance, froth, or pressure.', how: 'Positive values mean mark is above oracle; negative values mean mark is below oracle. Larger gaps suggest stronger dislocation.' },
  'Vol Impulse':      { short: 'Volume spike vs recent baseline.', why: 'Highlights unusual bursts of activity that may confirm a move, a breakout attempt, or a liquidity event.', how: 'Higher values mean current/recent volume is elevated relative to normal conditions.' },
  'Long Flush':       { short: 'Shorts paying + bullish fuel lit.', why: 'Flags names where the setup may support upside continuation or a squeeze after positioning pressure builds against shorts.', how: 'Treat this as a squeeze/bullish pressure watchlist. Use with price trend and OI context.' },
  'Funding Extremes': { short: 'Most extreme funding on either side.', why: 'Surfaces markets with the most stretched carry conditions, which can precede volatility, reversals, or squeezes.', how: 'Large absolute funding values matter most. Positive means long crowding; negative means short crowding.' },
  'Relative Strength Leaders': { short: 'Markets outperforming the benchmark.', why: 'Helps distinguish true leadership from names that are only rising because the whole market is up.', how: 'Higher relative strength means stronger performance versus the benchmark across the chosen lookback windows.' },
  'Order Book Pressure': { short: 'Bid/ask depth imbalance near the market.', why: 'Shows whether liquidity is leaning bullish or bearish right now, without forcing the user to interpret the DOM manually.', how: 'Positive pressure / bid support suggests stronger buy-side depth; negative pressure / ask pressure suggests heavier sell-side resistance.' },
  'OI Regime Shift':  { short: 'Trend vs squeeze classification.', why: 'Helps identify whether a move is being driven by fresh positioning, short covering, or liquidation rather than just price alone.', how: 'Read the regime label together with price % and OI %. Price up + OI up often signals fresh longs; price up + OI down often signals short covering.' },
  'OI Cap Risk':      { short: 'Open interest crowding / cap utilization.', why: 'Highlights markets approaching open interest capacity, where participation constraints and abnormal behavior can increase.', how: 'Higher utilization means a market is closer to its OI cap. "Near Cap" or "Cap Risk" suggests crowding and potential execution/liquidity weirdness.' },
};

function SectionInfoTooltip({ title }: { title: string }) {
  const tip = SECTION_TOOLTIPS[title];
  if (!tip) return null;
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    timeoutRef.current = setTimeout(() => setTipPos({ x, y }), 150);
  };
  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTipPos(null);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5, cursor: 'help' }}
      onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <span style={{ fontSize: 8, color: C.dim, border: `1px solid ${C.dim}`, borderRadius: '50%', width: 13, height: 13,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>i</span>
      {tipPos && (
        <div style={{
          position: 'fixed',
          left: Math.min(tipPos.x, window.innerWidth - 300),
          top: tipPos.y - 8,
          transform: 'translateY(-100%)',
          width: 290, padding: '10px 12px', zIndex: 99999,
          background: '#0c1526', border: `1px solid ${C.teal}55`, borderRadius: 6,
          boxShadow: `0 4px 24px rgba(0,0,0,0.75), 0 0 12px ${C.teal}22`,
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: C.teal, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 8.5, color: C.text, lineHeight: 1.5, marginBottom: 6 }}>{tip.short}</div>
          <div style={{ fontSize: 8, color: C.cyan, fontWeight: 700, marginBottom: 2 }}>Why it matters:</div>
          <div style={{ fontSize: 8, color: '#b0bec5', lineHeight: 1.5, marginBottom: 6 }}>{tip.why}</div>
          <div style={{ fontSize: 8, color: C.cyan, fontWeight: 700, marginBottom: 2 }}>How to read it:</div>
          <div style={{ fontSize: 8, color: '#b0bec5', lineHeight: 1.5 }}>{tip.how}</div>
        </div>
      )}
    </span>
  );
}

// ─── Strip exchange prefixes from symbols (e.g. "cash:BTC" → "BTC") ──────────
const cleanSym = (s: string) => s.replace(/^[a-zA-Z0-9]+:/g, '');

// ─── Formatters ───────────────────────────────────────────────────────────────
const pct  = (v: number | null, dec = 2) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(dec)}%`;
// pctD: for fields sent as decimals (0.40 = 40%) — multiplies by 100 before display
const pctD = (v: number | null, dec = 2) => pct(v == null ? null : v * 100, dec);
const $$   = (v: number | null) => v == null ? '—' : v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` : `$${v.toFixed(2)}`;
const px   = (v: number | null) => v == null ? '—' : v >= 1000 ? v.toLocaleString('en-US', { minimumFractionDigits:1, maximumFractionDigits:1 }) : v >= 1 ? v.toFixed(3) : v.toFixed(6);
const sc   = (v: number | null) => v == null ? '—' : v.toFixed(2);
const nn   = (v: number | null) => v == null ? '—' : v.toLocaleString();
const fmtF = (v: number | null) => v == null ? '—' : `${(v*100).toFixed(4)}%`;
const fmtD = (v: number | null) => pct(v == null ? null : v*100, 4);
const pctC = (v: number | null) => v == null ? C.dim : v > 0 ? C.green : v < 0 ? C.red : C.dim;
const scC  = (v: number | null) => v == null ? C.dim : v >= 0.6 ? C.green : v <= 0.35 ? C.red : C.amber;
const fC   = (v: number | null) => v == null ? C.dim : v > 0.001 ? C.green : v < -0.001 ? C.red : C.dim;

// ─── Signal-layer accessors (support both camelCase and snake_case) ───────────
const getOpportunityScore = (row: any): number =>
  row.opportunityScore ?? row.opportunity_score ?? row.matrixScore ?? row.matrix_score ?? row.agentScore ?? row.agent_score ?? row.overallScore ?? 0;
const getMatrixSignal = (row: any): string =>
  String(row.matrixSignal ?? row.matrix_signal ?? row.signalDirection ?? row.signal_direction ?? row.setupLabel ?? row.setup_label ?? 'NEUTRAL').toUpperCase();
const getMatrixReason = (row: any): string =>
  row.matrixReason ?? row.matrix_reason ?? row.signalReason ?? row.signal_reason ?? '';
const getMatrixDetail = (row: any): string =>
  row.matrixDetail ?? row.matrix_detail ?? row.signalDetail ?? row.signal_detail ?? '';
const getRiskScore = (row: any): number | null =>
  row.riskScore ?? row.risk_score ?? null;
const getRiskLabel = (row: any): string =>
  row.riskLabel ?? row.risk_label ?? '—';
const getRiskReason = (row: any): string =>
  row.riskReason ?? row.risk_reason ?? '';
const getFundingLabel = (row: any): string =>
  row.fundingLabel ?? row.funding_label ?? row.fundingBasisContext ?? row.funding_basis_context ?? '—';
const getFundingReason = (row: any): string =>
  row.fundingReason ?? row.funding_reason ?? '';
const getFlowLabel = (row: any): string =>
  row.flowLabel ?? row.flow_label ?? row.tapeBookContext ?? row.tape_book_context ?? row.liquidationContext ?? row.liquidation_context ?? '—';
const getFlowReason = (row: any): string =>
  row.flowReason ?? row.flow_reason ?? '';
const getOiDelta = (row: any): number | null =>
  row.oiDelta15mPct ?? row.oi_delta_15m_pct ?? row.oiDelta1hPct ?? row.oi_delta_1h_pct ?? null;
const getVolVelocity = (row: any): number | null =>
  row.volumeVelocity15m ?? row.volume_velocity_15m ?? row.volumeVelocity1h ?? row.volume_velocity_1h ?? null;
const getOpenInterest = (row: any): number | null =>
  row.openInterest ?? row.open_interest ?? row.oi ?? row.openInterestUsd ?? row.open_interest_usd ?? null;
const getVolume = (row: any): number | null =>
  row.volume24h ?? row.volume_24h ?? row.volume ?? row.vol ?? row.volume_24h_usd ?? row.volumeUsd ?? null;
const getPremium = (row: any): number | null =>
  row.premiumPct ?? row.premium_pct ?? row.premium ?? null;
const getMarkOracle = (row: any): number | null =>
  row.markOracleDeltaPct ?? row.mark_oracle_delta_pct ?? row.markOracleDelta ?? row.mark_oracle_delta ??
  row.mark_oracle_pct ?? row.distMarkOracle ?? null;
const getBook = (row: any): number | null =>
  row.bookImbalance ?? row.book_imbalance ?? row.bookPressure ?? row.book_pressure ?? row.bidAskImbalance ?? null;

const SIGNAL_COLOR: Record<string, string> = {
  LONG: '#22c55e', SHORT: '#ef4444', WATCH: '#06b6d4',
  CROWDED: '#f59e0b', AVOID: '#ef4444', NEUTRAL: '#64748b',
};
const sigColor        = (sig: string) => SIGNAL_COLOR[sig.toUpperCase()] ?? C.dim;
const riskLabelColor  = (label: string) => {
  const l = (label ?? '').toUpperCase();
  if (l === 'LOW') return C.green;
  if (l === 'MED' || l === 'MEDIUM' || l === 'MODERATE') return C.amber;
  return l === '—' ? C.dim : C.red;
};

// ─── Setup / direction maps ───────────────────────────────────────────────────
const SETUP_MAP: Record<string, { label: string; color: string }> = {
  breakout:           { label: 'Breakout',     color: C.green  },
  mean_reversion:     { label: 'Mean Rev',     color: C.blue   },
  trend_continuation: { label: 'Trend',        color: C.teal   },
  crowding_unwind:    { label: 'Crowd Unwind', color: C.amber  },
  avoid:              { label: 'Avoid',         color: C.red    },
  neutral:            { label: 'Neutral',      color: C.dim    },
};
const DIR_MAP: Record<string, { label: string; color: string }> = {
  long:    { label: 'LONG',  color: C.green },
  short:   { label: 'SHORT', color: C.red   },
  watch:   { label: 'WATCH', color: C.amber },
  avoid:   { label: 'AVOID', color: C.red   },
  neutral: { label: 'WATCH', color: C.dim   },
};
const rankColor = (r: number) => r === 1 ? C.gold : r === 2 ? C.silver : r === 3 ? C.amber : C.dim;

// ─── Signal section derivation ────────────────────────────────────────────────
interface DerivedSection {
  id: string; title: string; subtitle: string; color: string; always: boolean;
  items: { coin: string; primary: string; secondary?: string; direction: 'up'|'down'|'neutral' }[];
}
const dedup  = (arr: ScreenerRow[]) => { const s = new Set<string>(); return arr.filter(r => { if (s.has(r.coin)) return false; s.add(r.coin); return true; }); };
const topN   = (arr: ScreenerRow[], key: keyof ScreenerRow, n = 6, asc = false) =>
  dedup([...arr].filter(r => r[key] != null).sort((a,b) => asc ? (a[key] as number)-(b[key] as number) : (b[key] as number)-(a[key] as number))).slice(0,n);
const topNA  = (arr: ScreenerRow[], key: keyof ScreenerRow, n = 6) =>
  dedup([...arr].filter(r => r[key] != null).sort((a,b) => Math.abs(b[key] as number)-Math.abs(a[key] as number))).slice(0,n);

function deriveSignalSections(rows: ScreenerRow[]): DerivedSection[] {
  // Perps-only signal board — filter to perp rows for all sections
  const src = rows.filter(r => r.marketType === 'perp');
  const base = src.length > 0 ? src : rows; // fallback if marketType not populated yet

  const mk = (
    id: string, title: string, subtitle: string, color: string, always: boolean,
    items: ScreenerRow[], pF: (r: ScreenerRow) => string, sF?: (r: ScreenerRow) => string,
    dF?: (r: ScreenerRow) => 'up'|'down'|'neutral',
  ): DerivedSection => ({ id, title, subtitle, color, always, items: items.map(r => ({ coin:r.coin, primary:pF(r), secondary:sF?.(r), direction:dF?.(r)?? 'neutral' })) });

  const up = () => 'up' as const; const dn = () => 'down' as const;
  const aD = (r: ScreenerRow) => (r.change24hPct??0) >= 0 ? 'up' as const : 'down' as const;
  const fD = (r: ScreenerRow) => (r.funding??0) >= 0 ? 'up' as const : 'down' as const;
  const oD = (r: ScreenerRow) => (r.distMarkOracle??0) >= 0 ? 'up' as const : 'down' as const;

  // Conditional sections — only shown when data is available
  const oi_u = topN(base,'oiChangePct',6);
  const oi_d = topN(base,'oiChangePct',6,true);
  const vi   = topN(base,'volumeImpulse',6);

  // Short squeeze: positive funding (longs paying) + bearish signal = crowded long, fuel for squeeze
  const sq = base.filter(r => (r.funding??0)>0.0001 && r.signalDirection==='bearish')
    .sort((a,b)=>(b.funding??0)-(a.funding??0)).slice(0,6);

  // Long flush: negative funding (shorts paying) + bullish signal = crowded short, fuel for flush
  const ll = base.filter(r => (r.funding??0)<-0.0001 && r.signalDirection==='bullish')
    .sort((a,b)=>(a.funding??0)-(b.funding??0)).slice(0,6);

  // Funding carry extremes: annualized rate > 20% either direction
  const fundExtreme = base.filter(r => Math.abs((r.funding??0)*8760) > 0.20)
    .sort((a,b) => Math.abs(b.funding??0)-Math.abs(a.funding??0)).slice(0,6);

  // OI + momentum aligned: both OI growing and bullish signal (accumulation)
  const oiAccum = base.filter(r => (r.oiChangePct??0)>0 && r.signalDirection==='bullish')
    .sort((a,b)=>(b.oiChangePct??0)-(a.oiChangePct??0)).slice(0,6);

  return [
    // ── Always-on: core perps signals ──────────────────────────────────────────
    mk('gainers',   'Top Gainers',     'Strongest 24h price movers',        C.green,  true, topN(base,'change24hPct',6),     r=>pctD(r.change24hPct),   r=>$$(r.volume24h), up),
    mk('losers',    'Top Losers',      'Sharpest 24h price declines',       C.red,    true, topN(base,'change24hPct',6,true),r=>pctD(r.change24hPct),   r=>$$(r.volume24h), dn),
    mk('fund-hi',   'High Funding',    'Longs paying — squeeze watch',      C.amber,  true, topN(base,'funding',6),          r=>fmtF(r.funding),        r=>$$(r.openInterest), up),
    mk('fund-lo',   'Neg Funding',     'Shorts paying — flush watch',       C.blue,   true, topN(base,'funding',6,true),     r=>fmtF(r.funding),        r=>$$(r.openInterest), dn),
    mk('oi-top',    'OI Leaders',      'Largest open interest by USD',      C.purple, true, topN(base,'openInterest',6),     r=>$$(r.openInterest),     r=>pctD(r.change24hPct), aD),
    mk('vol-top',   'Volume Leaders',  'Largest 24h notional volume',       C.teal,   true, topN(base,'volume24h',6),        r=>$$(r.volume24h),        r=>$$(r.openInterest), aD),
    mk('breakout',  'Breakout Watch',  'Highest breakout readiness score',  C.green,  true, topN(base,'breakoutScore',6),    r=>sc(r.breakoutScore),    r=>pctD(r.change24hPct), up),
    mk('disloc',    'Mark/Oracle Gap', 'Mark vs oracle dislocation signal', C.amber,  true, topNA(base,'distMarkOracle',6),  r=>fmtD(r.distMarkOracle), r=>fmtF(r.funding), oD),
    // ── Conditional: require history / real-time data ─────────────────────────
    mk('oi-expand', 'OI Expansion',    'Open interest building — new money', C.green, false, oi_u, r=>pctD(r.oiChangePct), r=>$$(r.openInterest), up),
    mk('oi-unwind', 'OI Unwind',       'OI unwinding — positions closing',   C.red,   false, oi_d, r=>pctD(r.oiChangePct), r=>$$(r.openInterest), dn),
    mk('oi-accum',  'OI + Bullish',    'OI growing + bullish signal',        C.teal,  false, oiAccum, r=>pctD(r.oiChangePct), r=>$$(r.openInterest), up),
    mk('vol-imp',   'Vol Impulse',     'Volume spike vs recent baseline',    C.teal,  false, vi,   r=>sc(r.volumeImpulse), r=>$$(r.volume24h), up),
    mk('short-sqz', 'Short Squeeze',   'Longs paying + bearish — fuel lit',  C.red,   false, sq,   r=>fmtF(r.funding),     r=>$$(r.openInterest), up),
    mk('long-liq',  'Long Flush',      'Shorts paying + bullish — fuel lit', C.blue,  false, ll,   r=>fmtF(r.funding),     r=>$$(r.openInterest), dn),
    mk('fund-ext',  'Funding Extremes','Annualized carry > 20% either side', C.amber, false, fundExtreme, r=>fmtF(r.funding), r=>$$(r.openInterest), fD),
  ].filter(s => s.always || s.items.length > 0);
}

// ─── Summary chip (above hero) ────────────────────────────────────────────────
function SummaryChip({ label, coin, value, color, selected, onClick }: {
  label: string; coin?: string|null; value: string; color?: string; selected?: boolean; onClick?: () => void;
}) {
  const col = color ?? C.teal;
  return (
    <div onClick={onClick} style={{ background:selected?`${col}1a`:C.card, border:`1px solid ${selected?col:C.border}`, borderRadius:5, padding:'5px 11px', flexShrink:0, cursor:onClick?'pointer':'default', transition:'all 0.15s', minWidth:96 }}>
      <div style={{ fontSize:7.5, color:C.dim, letterSpacing:1.5, textTransform:'uppercase', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:11, fontWeight:800, color:col, fontFamily:C.font, lineHeight:1 }}>
        {coin && <span style={{ marginRight:4 }}>{coin}</span>}{value}
      </div>
    </div>
  );
}

// ─── Hero: Quick-Look Tile ────────────────────────────────────────────────────
function QuickLookTile({ label, coin, sub, color, preview }: {
  label: string; coin: string | null; sub: string; color: string; preview?: boolean;
}) {
  return (
    <div style={{ flex:1, padding:'8px 12px', borderRight:`1px solid ${C.dimLow}`, display:'flex', flexDirection:'column', gap:3 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        <span style={{ fontSize:7.5, color:C.dim, letterSpacing:1.5, textTransform:'uppercase' }}>{label}</span>
        {preview && <span style={{ fontSize:6.5, color:C.dimLow, background:C.dimLow, borderRadius:2, padding:'0 3px' }}>EST</span>}
      </div>
      <div style={{ fontSize:13, fontWeight:800, color:coin ? color : C.dimLow, fontFamily:C.font, lineHeight:1 }}>
        {coin ?? '—'}
      </div>
      <div style={{ fontSize:8.5, color:C.dim, lineHeight:1.3 }}>{sub}</div>
    </div>
  );
}

// ─── Hero: Idea Row ───────────────────────────────────────────────────────────
function IdeaRow({ coin, side, setupType, score, confidence, thesisSummary, rankMovement, rank, selected, onClick }: {
  coin: string; side: string; setupType: string | null; score: number; confidence: number;
  thesisSummary: string | null; rankMovement: number | null; rank: number; selected: boolean; onClick: () => void;
}) {
  const dir   = DIR_MAP[side]   ?? DIR_MAP.neutral;
  const setup = setupType ? (SETUP_MAP[setupType] ?? SETUP_MAP.neutral) : dir;
  return (
    <div onClick={onClick} style={{ padding:'7px 12px', cursor:'pointer', borderBottom:`1px solid ${C.dimLow}`, background:selected?`${C.purple}18`:'transparent', transition:'background 0.12s' }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background=`${C.purple}0c`; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background='transparent'; }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:thesisSummary?3:0 }}>
        {/* Rank */}
        <div style={{ width:22, height:22, borderRadius:4, background:`${rankColor(rank)}1a`, border:`1px solid ${rankColor(rank)}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:9, fontWeight:800, color:rankColor(rank), fontFamily:C.font }}>#{rank}</span>
        </div>
        {/* Coin */}
        <span style={{ fontSize:12, fontWeight:800, color:selected?C.purple:C.text, fontFamily:C.font, flexShrink:0, minWidth:52 }}>{coin}</span>
        {/* Side badge */}
        <span style={{ fontSize:8, fontWeight:700, color:dir.color, background:`${dir.color}18`, border:`1px solid ${dir.color}44`, borderRadius:3, padding:'1px 5px', flexShrink:0 }}>{dir.label}</span>
        {/* Setup badge */}
        {setupType && <span style={{ fontSize:7.5, color:setup.color, background:`${setup.color}10`, border:`1px solid ${setup.color}33`, borderRadius:3, padding:'1px 4px', flexShrink:0 }}>{setup.label}</span>}
        {/* Score bar + value */}
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ flex:1, height:3, background:C.dimLow, borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(100,score*100).toFixed(0)}%`, background:`linear-gradient(90deg,${C.purple},${C.teal})`, borderRadius:2, transition:'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize:8.5, fontWeight:700, color:C.purple, fontFamily:C.font, flexShrink:0 }}>{score.toFixed(2)}</span>
        </div>
        {/* Confidence */}
        <span style={{ fontSize:8, color:scC(confidence), flexShrink:0 }}>{(confidence*100).toFixed(0)}%</span>
        {/* Delta */}
        {rankMovement != null && rankMovement !== 0 && (
          <span style={{ fontSize:8, fontWeight:700, color:rankMovement>0?C.green:C.red, flexShrink:0 }}>{rankMovement>0?`▲${rankMovement}`:`▼${Math.abs(rankMovement)}`}</span>
        )}
      </div>
      {thesisSummary && (
        <div style={{ fontSize:8.5, color:C.dim, paddingLeft:30, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{thesisSummary}</div>
      )}
    </div>
  );
}

// ─── Hero: Rich Thesis Panel ──────────────────────────────────────────────────
function RichThesisPanel({ idea, row }: { idea: BriefingIdea | AgentRankedItem | null; row: ScreenerRow | null }) {
  const [chartIv, setChartIv] = useState<ChartInterval>('1h');

  if (!idea) {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:20, textAlign:'center' }}>
        <Bot style={{ width:28, height:28, color:C.dimLow }} />
        <div style={{ fontSize:10, color:C.dim }}>Select an idea to see the full thesis</div>
        <div style={{ fontSize:8.5, color:C.dimLow, maxWidth:200, lineHeight:1.6 }}>Each ranked signal includes reasons, what to watch, and invalidation notes</div>
      </div>
    );
  }

  // Normalise from both BriefingIdea and AgentRankedItem
  const isBriefing = 'thesisSummary' in idea;
  const coin         = idea.coin;
  const side         = isBriefing ? (idea as BriefingIdea).side : (idea as AgentRankedItem).direction;
  const setupType    = idea.setupType;
  const score        = isBriefing ? (idea as BriefingIdea).score : (idea as AgentRankedItem).agentScore;
  const confidence   = idea.confidence;
  const thesisText   = isBriefing ? ((idea as BriefingIdea).thesisSummary ?? '') : ((idea as AgentRankedItem).thesis ?? (idea as AgentRankedItem).rationale ?? '');
  const reasons      = isBriefing ? ((idea as BriefingIdea).reasons ?? []) : [];
  const whatToWatch  = isBriefing ? ((idea as BriefingIdea).whatToWatch ?? []) : [];
  const invalidation = isBriefing ? ((idea as BriefingIdea).invalidationNotes ?? []) : ((idea as AgentRankedItem).riskNote ? [(idea as AgentRankedItem).riskNote!] : []);
  const briefMetrics = isBriefing ? (idea as BriefingIdea).metrics : null;
  const contribs     = !isBriefing ? ((idea as AgentRankedItem).featureContributions ? Object.entries((idea as AgentRankedItem).featureContributions!).sort((a,b)=>b[1]-a[1]).slice(0,4) : null) : null;

  const dir   = DIR_MAP[side]   ?? DIR_MAP.neutral;
  const setup = setupType ? (SETUP_MAP[setupType] ?? SETUP_MAP.neutral) : dir;
  const rankMov = isBriefing ? (idea as BriefingIdea).rankMovement : (idea as AgentRankedItem).rankMovement;

  const Metric = ({ label, value, vc }: { label: string; value: string; vc?: string }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:1, padding:'4px 0', borderBottom:`1px solid ${C.dimLow}` }}>
      <span style={{ fontSize:7, color:C.dim, textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
      <span style={{ fontSize:10, fontFamily:C.font, fontWeight:600, color:vc??C.text }}>{value}</span>
    </div>
  );

  const Section = ({ title, color, children }: { title: string; color: string; children: React.ReactNode }) => (
    <>
      <div style={{ fontSize:7.5, color, letterSpacing:2, textTransform:'uppercase', fontWeight:800, marginTop:10, marginBottom:5 }}>{title}</div>
      {children}
    </>
  );

  const Bullets = ({ items, color }: { items: string[]; color: string }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {items.map((s,i) => (
        <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
          <span style={{ color, fontSize:9, flexShrink:0, marginTop:1 }}>•</span>
          <span style={{ fontSize:8.5, color:C.text, lineHeight:1.5 }}>{s}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* ── Thesis header (fixed) ── */}
      <div style={{ padding:'8px 12px 6px', borderBottom:`1px solid ${C.border}`, background:C.card2, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
          <span style={{ fontFamily:C.font, fontWeight:800, fontSize:15, color:C.text }}>{coin}</span>
          <span style={{ fontSize:8.5, fontWeight:700, color:dir.color, background:`${dir.color}18`, border:`1px solid ${dir.color}44`, borderRadius:3, padding:'2px 6px' }}>{dir.label}</span>
          {setupType && (
            <span style={{ fontSize:8, color:setup.color, background:`${setup.color}12`, border:`1px solid ${setup.color}33`, borderRadius:3, padding:'1px 5px' }}>{setup.label}</span>
          )}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            {rankMov != null && rankMov !== 0 && (
              <span style={{ fontSize:8, fontWeight:700, color:rankMov>0?C.green:C.red }}>
                {rankMov>0?`▲${rankMov}`:`▼${Math.abs(rankMov)}`} rank
              </span>
            )}
            <span style={{ fontSize:10, fontWeight:800, color:C.purple, fontFamily:C.font }}>Score {score.toFixed(2)}</span>
            <span style={{ fontSize:9, color:scC(confidence) }}>Conf {(confidence*100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* ── Scrollable body: chart + all metrics scroll together ── */}
      <div style={{ flex:1, overflowY:'auto' }}>

        {/* Inline chart */}
        <div style={{ background:'#050c16', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'3px 8px', gap:3 }}>
            {(['15m','1h','4h','1d'] as ChartInterval[]).map(t => (
              <button key={t} onClick={() => setChartIv(t)}
                style={{ fontSize:7.5, padding:'1px 5px', borderRadius:2, cursor:'pointer', fontFamily:C.font,
                  background: chartIv===t ? `${C.teal}22` : 'none',
                  border: `1px solid ${chartIv===t ? C.teal : C.border}`,
                  color: chartIv===t ? C.teal : C.dim }}>
                {t}
              </button>
            ))}
          </div>
          <CoinChartPanel coin={coin} interval={chartIv} />
        </div>

        {/* Key metrics grid */}
        <div style={{ padding:'6px 12px 0' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
            {row ? (
              <>
                <Metric label="Mark"        value={px(row.markPrice)} />
                <Metric label="24H Chg"     value={pctD(row.change24hPct)}  vc={pctC(row.change24hPct)} />
                <Metric label="Funding/hr"  value={fmtF(row.funding)}        vc={fC(row.funding)} />
                <Metric label="OI"          value={$$(row.openInterest)} />
                <Metric label="Volume"      value={$$(row.volume24h)} />
                <Metric label="Oracle"      value={px(row.oraclePrice)} />
                <Metric label="Mk/Oracle Δ" value={fmtD(row.distMarkOracle)} vc={pctC(row.distMarkOracle)} />
                <Metric label="Premium"     value={fmtD(row.premium)}         vc={pctC(row.premium)} />
                <Metric label="Trade Flow"  value={row.tradeImbalance==null?'—':row.tradeImbalance.toFixed(3)}  vc={pctC(row.tradeImbalance)} />
                <Metric label="Book Imbal"  value={row.bidAskImbalance==null?'—':row.bidAskImbalance.toFixed(3)} vc={pctC(row.bidAskImbalance)} />
                <Metric label="Vol Regime"  value={sc(row.volatility)}        vc={scC(row.volatility)} />
                <Metric label="Composite"   value={sc(row.compositeSignal)}   vc={scC(row.compositeSignal)} />
                {getOiDelta(row) != null && <Metric label="OI Δ"          value={`${getOiDelta(row)! >= 0 ? '+' : ''}${getOiDelta(row)!.toFixed(1)}%`} vc={pctC(getOiDelta(row))} />}
                {getVolVelocity(row) != null && <Metric label="Vol Velocity"  value={`${getVolVelocity(row)!.toFixed(1)}x`} vc={(getVolVelocity(row)! >= 1.5) ? C.green : C.dim} />}
                {(row as any).longLiq15m != null && <Metric label="Long Liq 15m"  value={$$((row as any).longLiq15m)} vc={C.red} />}
                {(row as any).shortLiq15m != null && <Metric label="Short Liq 15m" value={$$((row as any).shortLiq15m)} vc={C.green} />}
                {getOpportunityScore(row) > 0 && <Metric label="Opportunity"    value={getOpportunityScore(row).toFixed(2)} vc={C.purple} />}
                {getRiskScore(row) != null && <Metric label="Risk"           value={`${getRiskLabel(row)} ${getRiskScore(row)!.toFixed(2)}`} vc={riskLabelColor(getRiskLabel(row))} />}
              </>
            ) : briefMetrics ? (
              Object.entries(briefMetrics).slice(0,10).map(([k,v]) => (
                <Metric key={k} label={k.replace(/_/g,' ')} value={v==null?'—':v.toFixed(4)} />
              ))
            ) : null}
          </div>
          {row && (getMatrixSignal(row) !== 'NEUTRAL' || !!getMatrixReason(row) || getFundingLabel(row) !== '—') && (
            <div style={{ padding:'4px 12px 6px', borderTop:`1px solid ${C.dimLow}`, marginTop:2 }}>
              <div style={{ fontSize:7, color:C.dim, textTransform:'uppercase', letterSpacing:1.5, fontWeight:700, marginBottom:3 }}>Signal Context</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:3 }}>
                {(() => { const sig = getMatrixSignal(row); const col = sigColor(sig); return <span style={{ fontSize:8.5, fontWeight:800, color:col, background:`${col}18`, border:`1px solid ${col}44`, borderRadius:3, padding:'1px 6px' }}>{sig}</span>; })()}
                {getFundingLabel(row) !== '—' && <span style={{ fontSize:8, color:C.text, background:C.dimLow, borderRadius:3, padding:'1px 5px' }}>{getFundingLabel(row)}</span>}
                {getFlowLabel(row) !== '—' && <span style={{ fontSize:8, color:C.text, background:C.dimLow, borderRadius:3, padding:'1px 5px' }}>{getFlowLabel(row)}</span>}
              </div>
              {getMatrixReason(row) && <div style={{ fontSize:8, color:C.dim, lineHeight:1.5, marginBottom:2 }}>{getMatrixReason(row)}</div>}
              {getMatrixDetail(row) && <div style={{ fontSize:7.5, color:C.dimLow, lineHeight:1.5, marginBottom:2 }}>{getMatrixDetail(row)}</div>}
              {getFundingReason(row) && <div style={{ fontSize:7.5, color:C.dim, lineHeight:1.5 }}>Funding: {getFundingReason(row)}</div>}
              {getFlowReason(row) && <div style={{ fontSize:7.5, color:C.dim, lineHeight:1.5 }}>Flow: {getFlowReason(row)}</div>}
            </div>
          )}
        </div>

        {/* Rest of thesis content */}
        <div style={{ padding:'0 12px 10px' }}>
          {thesisText && (
            <Section title="Thesis" color={C.purple}>
              <div style={{ fontSize:9, color:C.text, lineHeight:1.65, background:`${C.purple}0c`, border:`1px solid ${C.purple}33`, borderRadius:4, padding:'7px 9px' }}>
                {thesisText}
              </div>
            </Section>
          )}
          {reasons.length > 0 && (
            <Section title="Why Now" color={C.green}>
              <Bullets items={reasons} color={C.green} />
            </Section>
          )}
          {whatToWatch.length > 0 && (
            <Section title="What to Watch" color={C.teal}>
              <Bullets items={whatToWatch} color={C.teal} />
            </Section>
          )}
          {contribs && contribs.length > 0 && (
            <Section title="Signal Drivers" color={C.teal}>
              {contribs.map(([k,v]) => (
                <div key={k} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                  <span style={{ fontSize:8, color:C.dim, minWidth:100 }}>{k.replace(/_/g,' ')}</span>
                  <div style={{ flex:1, height:3, background:C.dimLow, borderRadius:2 }}>
                    <div style={{ height:'100%', width:`${Math.min(100,v*100).toFixed(0)}%`, background:C.teal, borderRadius:2 }} />
                  </div>
                  <span style={{ fontSize:8, fontFamily:C.font, color:C.teal, flexShrink:0 }}>{(v*100).toFixed(0)}%</span>
                </div>
              ))}
            </Section>
          )}
          {invalidation.length > 0 && (
            <Section title="Invalidation / Risk" color={C.amber}>
              <div style={{ background:`${C.amber}0c`, border:`1px solid ${C.amber}44`, borderRadius:4, padding:'7px 9px' }}>
                <Bullets items={invalidation} color={C.amber} />
              </div>
            </Section>
          )}
          {row && (
            <div style={{ fontSize:7, color:C.dimLow, marginTop:10, display:'flex', gap:10, flexWrap:'wrap' }}>
              {row.maxLeverage!=null && <span>Max lev {row.maxLeverage}×</span>}
              {row.oiChangePct!=null && <span>OI Δ <span style={{ color:pctC(row.oiChangePct) }}>{pctD(row.oiChangePct)}</span></span>}
              {row.updatedAt && <span>Updated {new Date(row.updatedAt).toLocaleTimeString()}</span>}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Hero: Guidance Block ─────────────────────────────────────────────────────
function GuidanceBlock({ label, icon: Icon, color, coins, onSelect, selectedCoin }: {
  label: string; icon: any; color: string; coins: GuidanceCoin[]; onSelect: (c:string)=>void; selectedCoin: string|null;
}) {
  return (
    <div style={{ flex:1, borderRight:`1px solid ${C.dimLow}`, padding:'6px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
        <Icon style={{ width:10, height:10, color }} />
        <span style={{ fontSize:7.5, color, letterSpacing:1.5, textTransform:'uppercase', fontWeight:800 }}>{label}</span>
      </div>
      {coins.length === 0 ? (
        <span style={{ fontSize:8, color:C.dimLow }}>Run Agent for signals</span>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {coins.slice(0,3).map(c => (
            <div key={c.coin} onClick={() => onSelect(c.coin)}
              style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity='0.75'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity='1'}>
              <span style={{ fontSize:9.5, fontWeight:800, color:selectedCoin===c.coin?color:C.text, fontFamily:C.font, minWidth:40, flexShrink:0 }}>{c.coin}</span>
              {c.reason && <span style={{ fontSize:8, color:C.dim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.reason}</span>}
              {c.score!=null && <span style={{ fontSize:8, color:color, fontFamily:C.font, flexShrink:0, marginLeft:'auto' }}>{c.score.toFixed(2)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hero: Agent Market Brief ─────────────────────────────────────────────────
function AgentMarketBrief({ agentResult, agentLoading, agentStage, rows, selectedCoin, onSelect, middleSlot }: {
  agentResult: AgentResult | null; agentLoading: boolean; agentStage: string;
  rows: ScreenerRow[]; selectedCoin: string | null; onSelect: (coin: string) => void;
  middleSlot?: React.ReactNode;
}) {
  const briefing  = agentResult?.briefing ?? null;
  const isPreview = !agentResult;

  // Derive quick-look tiles
  const ql = useMemo(() => {
    if (briefing) return {
      bestLong:    briefing.bestLong,
      bestShort:   briefing.bestShort,
      bestBreakout:briefing.bestBreakoutWatch,
      bestExhaust: briefing.bestExhaustionWatch,
      regime:      briefing.marketRegime,
    };
    // Fallback: prefer new matrix signal fields, fall back to screener signals
    const matLongs   = [...rows].filter(r => getMatrixSignal(r) === 'LONG').sort((a,b) => getOpportunityScore(b) - getOpportunityScore(a));
    const matShorts  = [...rows].filter(r => getMatrixSignal(r) === 'SHORT').sort((a,b) => getOpportunityScore(b) - getOpportunityScore(a));
    const matWatch   = [...rows].filter(r => getMatrixSignal(r) === 'WATCH').sort((a,b) => getOpportunityScore(b) - getOpportunityScore(a));
    const matCrowded = [...rows].filter(r => ['CROWDED','AVOID'].includes(getMatrixSignal(r))).sort((a,b) => getOpportunityScore(b) - getOpportunityScore(a));
    const bullish = matLongs.length  > 0 ? matLongs  : rows.filter(r => r.signalDirection==='bullish').sort((a,b) => (b.compositeSignal??0)-(a.compositeSignal??0));
    const bearish = matShorts.length > 0 ? matShorts : rows.filter(r => r.signalDirection==='bearish').sort((a,b) => (a.compositeSignal??1)-(b.compositeSignal??1));
    const brk     = matWatch.length  > 0 ? matWatch  : [...rows].filter(r=>r.breakoutScore!=null).sort((a,b)=>(b.breakoutScore??0)-(a.breakoutScore??0));
    const exh     = matCrowded.length > 0 ? matCrowded : rows.filter(r => (r.funding??0)>0.015).sort((a,b)=>(b.funding??0)-(a.funding??0));
    const pctBull = rows.length ? (((matLongs.length || bullish.length) / rows.length) * 100).toFixed(0) : '—';
    return {
      bestLong:    bullish[0]  ? { coin:bullish[0].coin,  side:'long'  as const, score:getOpportunityScore(bullish[0]) || bullish[0].compositeSignal||0,  thesisSummary: getMatrixReason(bullish[0])  || `Score ${(getOpportunityScore(bullish[0])||bullish[0].compositeSignal||0).toFixed(2)}` } : null,
      bestShort:   bearish[0]  ? { coin:bearish[0].coin,  side:'short' as const, score:getOpportunityScore(bearish[0]) || bearish[0].compositeSignal||0,  thesisSummary: getMatrixReason(bearish[0])  || `Score ${(getOpportunityScore(bearish[0])||bearish[0].compositeSignal||0).toFixed(2)}` } : null,
      bestBreakout:brk[0]      ? { coin:brk[0].coin,      side:'watch' as const, score:getOpportunityScore(brk[0])     || brk[0].breakoutScore||0,         thesisSummary: getMatrixReason(brk[0])      || `Watch score ${(getOpportunityScore(brk[0])||brk[0].breakoutScore||0).toFixed(2)}` } : null,
      bestExhaust: exh[0]      ? { coin:exh[0].coin,      side:'watch' as const, score:getOpportunityScore(exh[0])     || exh[0].funding||0,               thesisSummary: getMatrixReason(exh[0])      || `Crowded · ${getMatrixSignal(exh[0])}` } : null,
      regime: rows.length ? `${pctBull}% long · ${rows.length} perps scanned` : null,
    };
  }, [briefing, rows]);

  // Dedupe ranked ideas by canonical coin — keeps highest-scoring row per coin
  const dedupeIdeas = (arr: BriefingIdea[]): BriefingIdea[] => {
    const seen = new Map<string, BriefingIdea>();
    for (const idea of arr) {
      const key = ((idea as any).coin || (idea as any).symbol || (idea as any).asset || (idea as any).name || '').toUpperCase().trim();
      if (!key) continue;
      const existing = seen.get(key);
      if (!existing || idea.score > existing.score) seen.set(key, idea);
    }
    return [...seen.values()];
  };

  // Derive ranked ideas
  const ideas: BriefingIdea[] = useMemo(() => {
    if (briefing?.actionableIdeas.length) return dedupeIdeas(briefing.actionableIdeas).slice(0,10);
    if (agentResult) {
      const raw = agentResult.rankedCoins.slice(0,20).map(a => ({
        coin:a.coin, side:a.direction as any, setupType:a.setupType, score:a.agentScore,
        confidence:a.confidence, thesisTitle:null, thesisSummary:a.thesis??a.rationale,
        reasons:null, whatToWatch:null, invalidationNotes:a.riskNote?[a.riskNote]:null,
        rankMovement:a.rankMovement, metrics:null,
      }));
      return dedupeIdeas(raw).slice(0,10);
    }
    const raw = rows.filter(r=>r.compositeSignal!=null).sort((a,b)=>(b.compositeSignal!-a.compositeSignal!)).slice(0,20).map((r,i)=>({
      coin:r.coin, side:(r.signalDirection==='bullish'?'long':r.signalDirection==='bearish'?'short':'watch') as any,
      setupType:null, score:r.compositeSignal!, confidence:r.signalConfidence??0.5,
      thesisTitle:null, thesisSummary:r.agentRationale??null, reasons:null, whatToWatch:null,
      invalidationNotes:null, rankMovement:null, metrics:null,
    }));
    return dedupeIdeas(raw).slice(0,10);
  }, [briefing, agentResult, rows]);

  // Derive guidance buckets
  const guidance = useMemo(() => {
    if (briefing?.guidance) return briefing.guidance;
    const toGC = (arr: AgentRankedItem[]): GuidanceCoin[] => arr.slice(0,3).map(a=>({ coin:a.coin, reason:a.thesis?.slice(0,60)??a.rationale.slice(0,60), score:a.agentScore }));
    if (agentResult) return {
      tradeNow:      toGC(agentResult.longs),
      watchBreakout: toGC(agentResult.breakouts??[]),
      watchCollapse: toGC(agentResult.shorts),
      avoid:         toGC(agentResult.avoid),
    };
    const bull = rows.filter(r=>r.signalDirection==='bullish').sort((a,b)=>(b.compositeSignal??0)-(a.compositeSignal??0)).slice(0,3).map(r=>({ coin:r.coin, reason:null, score:r.compositeSignal }));
    const brk  = [...rows].filter(r=>r.breakoutScore!=null).sort((a,b)=>(b.breakoutScore??0)-(a.breakoutScore??0)).slice(0,3).map(r=>({ coin:r.coin, reason:null, score:r.breakoutScore }));
    const bear = rows.filter(r=>r.signalDirection==='bearish').sort((a,b)=>(a.compositeSignal??1)-(b.compositeSignal??1)).slice(0,3).map(r=>({ coin:r.coin, reason:null, score:r.compositeSignal }));
    const illiq= [...rows].filter(r=>r.liquidityScore!=null).sort((a,b)=>(a.liquidityScore??1)-(b.liquidityScore??1)).slice(0,3).map(r=>({ coin:r.coin, reason:null, score:r.liquidityScore }));
    return { tradeNow:bull, watchBreakout:brk, watchCollapse:bear, avoid:illiq };
  }, [briefing, agentResult, rows]);

  // Selected idea state (local to hero)
  const [selectedIdx, setSelectedIdx] = useState(0);
  const effIdx       = Math.min(selectedIdx, ideas.length-1);
  const selectedIdea = ideas[effIdx] ?? null;
  const agentItem    = agentResult ? agentResult.rankedCoins.find(r => r.coin === selectedIdea?.coin) ?? null : null;
  const selectedRow  = selectedIdea ? rows.find(r => r.coin === selectedIdea.coin) ?? null : null;

  // Thesis display: prefer BriefingIdea, fall back to AgentRankedItem
  const thesisIdea: BriefingIdea | AgentRankedItem | null = selectedIdea ?? agentItem;

  return (
    <div style={{ background:C.hero, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>

      {/* ── LLM Analysis strip (shown only after Agent button is clicked) ── */}
      {agentResult?.llmAnalysis && (
        <div style={{ padding:'10px 14px', background:'#050c16', borderBottom:`1px solid ${C.dimLow}` }}>
          <div style={{ fontSize:10, color:'#c8d8e8', lineHeight:1.7, fontFamily:'"Inter","Segoe UI",sans-serif' }}>
            {agentResult.llmAnalysis}
          </div>
        </div>
      )}

      {/* ── A: Quick-look tiles ── */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.dimLow}`, background:'#070d19' }}>
        <QuickLookTile label="Best Long"         coin={ql.bestLong?.coin??null}    sub={ql.bestLong?.thesisSummary??'No signal yet'} color={C.green}  preview={isPreview} />
        <QuickLookTile label="Best Short"        coin={ql.bestShort?.coin??null}   sub={ql.bestShort?.thesisSummary??'No signal yet'} color={C.red}   preview={isPreview} />
        <QuickLookTile label="Best Watch"        coin={ql.bestBreakout?.coin??null}sub={ql.bestBreakout?.thesisSummary??'No signal yet'} color={C.teal} preview={isPreview} />
        <QuickLookTile label="Crowded / Avoid"   coin={ql.bestExhaust?.coin??null} sub={ql.bestExhaust?.thesisSummary??'No signal yet'} color={C.amber} preview={isPreview} />
        <div style={{ flex:1, padding:'8px 12px', display:'flex', flexDirection:'column', gap:3 }}>
          <span style={{ fontSize:7.5, color:C.dim, letterSpacing:1.5, textTransform:'uppercase' }}>Market Regime</span>
          <span style={{ fontSize:11, fontWeight:700, color:ql.regime?C.text:C.dimLow, lineHeight:1.2 }}>{ql.regime ?? '—'}</span>
        </div>
      </div>

      {/* ── Market Matrix (injected between quick-look tiles and ranked ideas) ── */}
      {middleSlot}

      {/* ── B: Ranked ideas + C: Thesis ── */}
      <div style={{ display:'flex', height:320 }}>
        {/* Left: ideas list */}
        <div style={{ width:380, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
          {/* Header */}
          <div style={{ display:'flex', gap:8, padding:'3px 12px', borderBottom:`1px solid ${C.dimLow}`, flexShrink:0 }}>
            <span style={{ fontSize:7.5, color:C.dim, minWidth:22 }}>#</span>
            <span style={{ fontSize:7.5, color:C.dim, minWidth:52 }}>COIN</span>
            <span style={{ fontSize:7.5, color:C.dim }}>SIDE · SETUP · ONE-LINE</span>
            <span style={{ fontSize:7.5, color:C.dim, marginLeft:'auto' }}>SCR</span>
          </div>
          {ideas.length === 0
            ? <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:C.dimLow, textAlign:'center', padding:'0 20px' }}>{agentLoading ? 'Analyzing…' : 'No data. Load screener first.'}</div>
            : <div style={{ flex:1, overflowY:'auto' }}>
                {ideas.map((idea, i) => (
                  <IdeaRow key={idea.coin} rank={i+1} coin={idea.coin} side={idea.side} setupType={idea.setupType}
                    score={idea.score} confidence={idea.confidence} thesisSummary={idea.thesisSummary}
                    rankMovement={idea.rankMovement} selected={effIdx===i}
                    onClick={() => { setSelectedIdx(i); onSelect(idea.coin); }} />
                ))}
              </div>
          }
          {isPreview && ideas.length > 0 && (
            <div style={{ padding:'5px 12px', fontSize:8, color:C.dimLow, textAlign:'center', borderTop:`1px solid ${C.dimLow}`, flexShrink:0 }}>
              Preview ranking — press Agent above for AI analysis
            </div>
          )}
        </div>
        {/* Right: thesis panel */}
        <div style={{ flex:1, overflow:'hidden' }}>
          <RichThesisPanel idea={thesisIdea} row={selectedRow} />
        </div>
      </div>

      {/* ── D: Guidance blocks ── */}
      <div style={{ display:'flex', borderTop:`1px solid ${C.dimLow}`, background:'#060d18', minHeight:72 }}>
        <GuidanceBlock label="Trade Now"       icon={TrendingUp}   color={C.green}  coins={guidance.tradeNow}      onSelect={c=>{onSelect(c);}} selectedCoin={selectedCoin} />
        <GuidanceBlock label="Watch Breakout"  icon={Zap}          color={C.teal}   coins={guidance.watchBreakout} onSelect={c=>{onSelect(c);}} selectedCoin={selectedCoin} />
        <GuidanceBlock label="Watch Collapse"  icon={TrendingDown} color={C.amber}  coins={guidance.watchCollapse} onSelect={c=>{onSelect(c);}} selectedCoin={selectedCoin} />
        <GuidanceBlock label="Avoid"           icon={ShieldAlert}  color={C.red}    coins={guidance.avoid}         onSelect={c=>{onSelect(c);}} selectedCoin={selectedCoin} />
      </div>
    </div>
  );
}

// ─── Signal Board ─────────────────────────────────────────────────────────────
function SignalBoard({ section, selectedCoin, onSelect, onChartOpen }: {
  section: DerivedSection; selectedCoin: string|null; onSelect: (coin: string) => void;
  onChartOpen?: (title: string, coins: string[]) => void;
}) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, borderTop:`2px solid ${section.color}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'6px 10px 4px', borderBottom:`1px solid ${C.dimLow}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center' }}>
          <span style={{ fontSize:8.5, fontWeight:800, letterSpacing:1.5, color:section.color, textTransform:'uppercase' }}>{section.title}</span>
          <SectionInfoTooltip title={section.title} />
          {onChartOpen && (
            <ChartBtn onClick={() => onChartOpen(section.title, section.items.map(i => i.coin))} />
          )}
        </div>
        <div style={{ fontSize:7.5, color:C.dim, marginTop:1 }}>{section.subtitle}</div>
      </div>
      {section.items.map((item, i) => {
        const sel  = selectedCoin === item.coin;
        const dirC = item.direction==='up'?C.green:item.direction==='down'?C.red:C.dim;
        return (
          <div key={item.coin} onClick={() => onSelect(item.coin)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', cursor:'pointer', transition:'background 0.1s', background:sel?`${section.color}15`:'transparent', borderBottom:i<section.items.length-1?`1px solid ${C.dimLow}`:'none' }}
            onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background=`${section.color}09`; }}
            onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background='transparent'; }}>
            <span style={{ fontSize:7.5, color:C.dimLow, fontFamily:C.font, minWidth:12, textAlign:'right', flexShrink:0 }}>{i+1}</span>
            <span style={{ fontSize:9.5, fontWeight:700, color:sel?section.color:C.text, fontFamily:C.font, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.coin}</span>
            <span style={{ fontSize:9.5, fontWeight:600, color:dirC, fontFamily:C.font, flexShrink:0 }}>{item.primary}</span>
            {item.secondary && <span style={{ fontSize:7.5, color:C.dim, flexShrink:0 }}>{item.secondary}</span>}
            <span style={{ fontSize:7.5, color:dirC, flexShrink:0 }}>{item.direction==='up'?'▲':item.direction==='down'?'▼':''}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Market Matrix ────────────────────────────────────────────────────────────
type CK = keyof ScreenerRow;


// ─── TSMOM Types ──────────────────────────────────────────────────────────────
interface TsmomSignal {
  coin:           string;
  s_raw:          number;
  s_adj:          number;
  sigma:          number;    // annualized vol %
  funding_bps:    number;    // bps/hr
  funding_ann_pct: number;
  w_scaled:       number;    // target weight %
  side:           'long' | 'short' | 'flat';
  momentum_10d:   number | null;
  momentum_30d:   number | null;
  bars_used:      number;
}
interface TsmomMeta {
  total_signals: number;
  long_count:    number;
  short_count:   number;
  flat_count:    number;
  generated_at:  string;
}
interface TsmomResult {
  signals: TsmomSignal[];
  meta:    TsmomMeta;
}

// ─── Trade Radar Types ────────────────────────────────────────────────────────
interface TradeRadarCard {
  coin:          string | null;
  direction:     string | null;
  setup_type:    string | null;
  confidence:    number | null;
  thesis:        string | null;
  entry_trigger: string | null;
  confirmation:  string | null;
  invalidation:  string | null;
  bias:          string | null;
  score:         number | null;
}
interface TradeRadarSetup {
  coin:          string;
  direction:     string;
  setup_type:    string | null;
  confidence:    number | null;
  score:         number | null;
  thesis:        string | null;
  entry_trigger: string | null;
  confirmation:  string | null;
  invalidation:  string | null;
}
interface TradeRadarRegime {
  regime_label?:       string | null;
  summary?:            string | null;
  long_pct?:           number | null;
  short_pct?:          number | null;
  watch_pct?:          number | null;
  avoid_pct?:          number | null;
  total_assets_scanned?: number | null;
}
interface TradeRadarData {
  trade_radar: {
    market_regime:     string | TradeRadarRegime | null;
    cards: {
      best_long:      TradeRadarCard | null;
      best_short:     TradeRadarCard | null;
      squeeze_watch:  TradeRadarCard | null;
      pullback_buy:   TradeRadarCard | null;
      crowded_avoid:  TradeRadarCard | null;
    };
    top_setups:        TradeRadarSetup[];
    selected_defaults: { top_ticker: string | null } | null;
  };
  meta: {
    assets_scanned: number;
    elapsed_ms:     number;
    generated_at:   string;
  };
}

// ─── Advanced Signal Types ───────────────────────────────────────────────────
interface RSLeader {
  symbol: string; rs_score: number; return_1h: number; return_4h: number;
  return_24h: number; benchmark: string; oi_change_pct?: number; volume_impulse?: number;
}
interface OBPressure {
  symbol: string; pressure_score: number; bid_depth: number; ask_depth: number;
  imbalance: number; spread: number; microprice_bias?: number; direction: string;
}
interface OIRegime {
  symbol: string; regime: string; regime_key?: string;
  price_change_1h_pct: number; price_change_24h_pct?: number;
  oi_change_1h_pct: number; oi_change_24h_pct?: number;
  volume_impulse: number; regime_score: number;
  open_interest_usd?: number; volume_24h?: number;
  funding_ann_pct?: number; mark_price?: number; display_name?: string;
}
interface OICapRisk {
  symbol: string; display_name: string; mark_price: number; current_oi: number;
  oi_cap: number; utilization: number; utilization_pct: number; cap_remaining: number;
  status: string; funding_ann_pct?: number; price_change_pct?: number;
}
interface AdvancedSignals {
  relative_strength_leaders: RSLeader[];
  order_book_pressure: OBPressure[];
  oi_regime_shift: OIRegime[];
  oi_cap_risk?: OICapRisk[];
  as_of: string;
  metadata: { benchmark: string; depth_window_bps: number; intervals: string[] };
}

// Direction color maps for OI regime
const REGIME_COLOR: Record<string, string> = {
  'Fresh Longs':      C.green,
  'Fresh Shorts':     C.red,
  'Short Covering':   C.amber,
  'Long Liquidation': '#f97316', // orange
};

const OB_DIR_COLOR: Record<string, string> = {
  'Bid Support':  C.green,
  'Ask Pressure': C.red,
  'Balanced':     C.dim,
};

const CAP_STATUS_COLOR: Record<string, string> = {
  'Normal':    C.green,
  'Crowded':   C.amber,
  'Near Cap':  '#f97316', // orange
  'Cap Risk':  C.red,
};

// ─── Chart components ─────────────────────────────────────────────────────────
interface HLCandle { t: number; o: string; h: string; l: string; c: string; v: string; n: number }
type ChartInterval = '15m' | '1h' | '4h' | '1d';
const CHART_LIMITS: Record<ChartInterval, number> = { '15m': 200, '1h': 120, '4h': 120, '1d': 200 };

function SvgSparkline({ candles, gradId }: { candles: HLCandle[]; gradId: string }) {
  if (candles.length < 2) return null;
  const closes = candles.map(c => parseFloat(c.c));
  const min = Math.min(...closes), max = Math.max(...closes);
  const range = max - min || 1;
  const W = 500, H = 56;
  const px2 = (i: number) => (i / (closes.length - 1)) * W;
  const py  = (v: number) => H - ((v - min) / range) * (H * 0.88) - H * 0.06;
  const pts = closes.map((v, i) => `${px2(i)},${py(v)}`).join(' ');
  const area = `0,${H} ` + pts + ` ${W},${H}`;
  const isUp = closes[closes.length - 1] >= closes[0];
  const col  = isUp ? C.green : C.red;

  // Date/time axis — smart format based on time span
  const span   = candles[candles.length - 1].t - candles[0].t;
  const useTime = span < 3 * 86_400_000;
  const fmtTick = (ts: number) => {
    const d = new Date(ts);
    return useTime
      ? `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const mid = Math.floor(candles.length / 2);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={col} stopOpacity={0.28} />
            <stop offset="100%" stopColor={col} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradId})`} />
        <polyline points={pts}  fill="none" stroke={col} strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0 0' }}>
        <span style={{ fontSize: 7, color: C.dimLow, fontFamily: C.font }}>{fmtTick(candles[0].t)}</span>
        <span style={{ fontSize: 7, color: C.dimLow, fontFamily: C.font }}>{fmtTick(candles[mid].t)}</span>
        <span style={{ fontSize: 7, color: C.dimLow, fontFamily: C.font }}>Now</span>
      </div>
    </div>
  );
}

function CoinChartPanel({ coin, interval }: { coin: string; interval: ChartInterval }) {
  const { data: primary, isLoading: primaryLoading } = useQuery({
    queryKey: ['hl-candles', coin, interval],
    queryFn: async () => {
      const r = await fetch(`/api/hyperliquid/candles?coin=${encodeURIComponent(coin)}&interval=${interval}&limit=${CHART_LIMITS[interval]}`);
      if (!r.ok) throw new Error(`Candles ${r.status}`);
      return r.json() as Promise<{ candles: HLCandle[] }>;
    },
    staleTime: 5 * 60_000,
    gcTime:    30 * 60_000,
    retry: 1,
  });

  const primaryCandles = primary?.candles ?? [];
  const needsFallback = !primaryLoading && primaryCandles.length <= 1 && interval !== '1d';

  const { data: fallback, isLoading: fallbackLoading } = useQuery({
    queryKey: ['hl-candles', coin, '1d'],
    queryFn: async () => {
      const r = await fetch(`/api/hyperliquid/candles?coin=${encodeURIComponent(coin)}&interval=1d&limit=${CHART_LIMITS['1d']}`);
      if (!r.ok) throw new Error(`Candles fallback ${r.status}`);
      return r.json() as Promise<{ candles: HLCandle[] }>;
    },
    enabled: needsFallback,
    staleTime: 5 * 60_000,
    gcTime:    30 * 60_000,
    retry: 1,
  });

  const candles = primaryCandles.length > 1 ? primaryCandles : (fallback?.candles ?? []);
  const isLoading = primaryLoading || (needsFallback && fallbackLoading);
  const displayInterval = primaryCandles.length > 1 ? interval : (fallback ? '1d' : interval);

  const last  = candles.length > 0 ? parseFloat(candles[candles.length - 1].c) : null;
  const first = candles.length > 0 ? parseFloat(candles[0].c) : null;
  const chg   = last != null && first != null ? ((last - first) / Math.abs(first)) * 100 : null;
  const isUp  = chg != null && chg >= 0;
  const fmtPx = (p: number) =>
    p >= 1000 ? `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : p >= 1   ? `$${p.toFixed(2)}`
    :            `$${p.toFixed(5)}`;
  const gradId = `sg-${coin.replace(/[^a-z0-9]/gi, '')}-${displayInterval}`;
  return (
    <div style={{ borderBottom: `1px solid ${C.dimLow}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 2px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: C.font }}>{coin}</span>
        {last != null && <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font }}>{fmtPx(last)}</span>}
        {displayInterval !== interval && (
          <span style={{ fontSize: 7, color: C.dimLow, fontFamily: C.font }}>({displayInterval})</span>
        )}
        {chg  != null && (
          <span style={{ fontSize: 9, fontWeight: 700, color: isUp ? C.green : C.red, marginLeft: 'auto', fontFamily: C.font }}>
            {isUp ? '+' : ''}{chg.toFixed(2)}%
          </span>
        )}
      </div>
      <div style={{ padding: '0 12px 6px' }}>
        {isLoading ? (
          <div style={{ height: 56, background: C.dimLow, borderRadius: 2, opacity: 0.2 }} />
        ) : candles.length > 1 ? (
          <SvgSparkline candles={candles} gradId={gradId} />
        ) : (
          <div style={{ height: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <span style={{ fontSize: 8, color: C.dimLow }}>No chart data available</span>
            <span style={{ fontSize: 7, color: C.dimLow, opacity: 0.6 }}>Try a different interval</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartListModal({ title, coins: rawCoins, onClose }: { title: string; coins: string[]; onClose: () => void }) {
  const [iv, setIv] = useState<ChartInterval>('1d');
  const coins = [...new Set(rawCoins)]; // deduplicate
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, width: 580, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.card2 }}>
          <BarChart2 style={{ width: 11, height: 11, color: C.teal }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: C.teal, textTransform: 'uppercase' }}>{title}</span>
          <span style={{ fontSize: 8, color: C.dim }}>· {coins.length} assets</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {(['15m', '1h', '4h', '1d'] as ChartInterval[]).map(t => (
              <button key={t} onClick={() => setIv(t)}
                style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 3, cursor: 'pointer', fontFamily: C.font,
                  background: iv === t ? `${C.teal}22` : 'none',
                  border: `1px solid ${iv === t ? C.teal : C.border}`,
                  color: iv === t ? C.teal : C.dim }}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: 2, marginLeft: 6, display: 'flex' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
        {/* Scrollable chart list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {coins.map(coin => (
            <CoinChartPanel key={`${coin}-${iv}`} coin={coin} interval={iv} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartBtn({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(e); }}
      title="View charts for this section"
      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 3, cursor: 'pointer',
        padding: '1px 4px', display: 'flex', alignItems: 'center', color: C.dim, marginLeft: 2 }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = C.teal; el.style.borderColor = C.teal; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = C.dim; el.style.borderColor = C.border; }}>
      <BarChart2 style={{ width: 9, height: 9 }} />
    </button>
  );
}

// ─── Advanced Signal Cards ───────────────────────────────────────────────────
function AdvancedSignalCards({ selectedCoin, onSelect, onChartOpen }: {
  selectedCoin: string | null;
  onSelect: (coin: string) => void;
  onChartOpen: (title: string, coins: string[]) => void;
}) {
  const { data: rawSignals, isLoading, isError } = useQuery<AdvancedSignals>({
    queryKey: ['hl-advanced-signals'],
    queryFn: async () => {
      const r = await fetch('/api/hyperliquid/signals');
      if (!r.ok) throw new Error(`Signals ${r.status}`);
      return r.json();
    },
    refetchInterval: 30_000,
    staleTime: 29_000,
    gcTime: 60 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(3000 * (attempt + 1), 15000),
    refetchOnWindowFocus: false,
    placeholderData: (prev: any) => prev,
  });

  // ── Persistent last-good cache ─────────────────────────────────────────────
  // Ensures sections always show data even when FastAPI is initializing or 503
  const _lastGoodSig = useRef<AdvancedSignals | null>(null);
  if (_lastGoodSig.current === null) {
    try { const c = localStorage.getItem('hl_signals_cache'); if (c) _lastGoodSig.current = JSON.parse(c); } catch {}
  }
  const _sigHasContent = (d: AdvancedSignals | null | undefined) =>
    !!(d && ((d.relative_strength_leaders?.length ?? 0) > 0 ||
             (d.order_book_pressure?.length ?? 0) > 0 ||
             (d.oi_regime_shift?.length ?? 0) > 0));
  if (_sigHasContent(rawSignals)) {
    _lastGoodSig.current = rawSignals!;
    try { localStorage.setItem('hl_signals_cache', JSON.stringify(rawSignals)); } catch {}
  }
  const data = _sigHasContent(rawSignals) ? rawSignals : (_lastGoodSig.current ?? rawSignals);

  const rsLeaders = useMemo(() =>
    [...(data?.relative_strength_leaders ?? [])].sort((a, b) => b.rs_score - a.rs_score).slice(0, 10),
    [data]);
  const obPressure = useMemo(() =>
    [...(data?.order_book_pressure ?? [])].sort((a, b) => Math.abs(b.pressure_score) - Math.abs(a.pressure_score)).slice(0, 10),
    [data]);
  const oiRegime = useMemo(() =>
    [...(data?.oi_regime_shift ?? [])].sort((a, b) => b.regime_score - a.regime_score).slice(0, 10),
    [data]);
  const oiCapRisk = useMemo(() =>
    [...(data?.oi_cap_risk ?? [])].sort((a, b) => b.utilization - a.utilization).slice(0, 10),
    [data]);

  // Null-safe numeric formatter — prevents crashes when backend fields are null
  const nf = (v: number | null | undefined, dec: number, suffix = '') =>
    v == null ? '—' : `${v.toFixed(dec)}${suffix}`;

  const cardStyle: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
    display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
  };

  const headerStyle = (color: string): React.CSSProperties => ({
    padding: '6px 10px 4px', borderBottom: `1px solid ${C.dimLow}`, borderTop: `2px solid ${color}`, flexShrink: 0,
  });

  const colHeaderStyle: React.CSSProperties = {
    fontSize: 7, fontWeight: 700, letterSpacing: 1, color: C.dim, textTransform: 'uppercase',
  };

  // Only show skeleton/error when there is truly no data at all (no cache either)
  if (isLoading && !data) {
    return (
      <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ ...cardStyle, borderTop: `2px solid ${C.border}`, height: 220 }}>
            <div style={{ padding: 10 }}>
              <div style={{ height: 10, width: '60%', background: C.dimLow, borderRadius: 2, marginBottom: 6 }} />
              <div style={{ height: 8, width: '40%', background: C.dimLow, borderRadius: 2 }} />
            </div>
            {[0, 1, 2, 3, 4].map(j => (
              <div key={j} style={{ padding: '4px 10px', borderBottom: `1px solid ${C.dimLow}` }}>
                <div style={{ height: 8, width: `${60 + j * 5}%`, background: C.dimLow, borderRadius: 2 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>

      {/* ── Relative Strength Leaders ─────────────────── */}
      <div style={cardStyle}>
        <div style={headerStyle(C.teal)}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5, color: C.teal, textTransform: 'uppercase' }}>
              Relative Strength Leaders
            </span>
            <SectionInfoTooltip title="Relative Strength Leaders" />
            <ChartBtn onClick={() => onChartOpen('RS Leaders', rsLeaders.map(r => cleanSym(r.symbol)))} />
          </div>
          <div style={{ fontSize: 7.5, color: C.dim, marginTop: 1 }}>Outperforming benchmark</div>
        </div>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '20px 52px 1fr 52px 48px 48px', padding: '3px 10px', background: '#060b14', borderBottom: `1px solid ${C.border}`, gap: 0 }}>
          <span style={colHeaderStyle}>#</span>
          <span style={colHeaderStyle}>COIN</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>RS</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>24H</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>4H</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>1H</span>
        </div>
        {rsLeaders.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', fontSize: 8.5, color: C.dim }}>No data yet</div>
        ) : rsLeaders.map((r, i) => {
          const isSel = selectedCoin === r.symbol;
          return (
            <div key={r.symbol} onClick={() => onSelect(r.symbol)}
              style={{ display: 'grid', gridTemplateColumns: '20px 52px 1fr 52px 48px 48px', padding: '3px 10px', cursor: 'pointer',
                background: isSel ? `${C.teal}18` : i % 2 === 0 ? C.bg : C.card2,
                borderBottom: `1px solid ${C.dimLow}`, alignItems: 'center', gap: 0, transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = `${C.teal}0c`; }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? C.bg : C.card2; }}>
              <span style={{ fontSize: 7.5, color: C.dimLow, fontFamily: C.font }}>{i + 1}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: isSel ? C.teal : C.text, fontFamily: C.font }}>{cleanSym(r.symbol)}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: (r.rs_score ?? 0) >= 0 ? C.green : C.red, fontFamily: C.font, textAlign: 'right' }}>
                {r.rs_score == null ? '—' : `${r.rs_score >= 0 ? '+' : ''}${r.rs_score.toFixed(2)}`}
              </span>
              <span style={{ fontSize: 8.5, color: pctC(r.return_24h), fontFamily: C.font, textAlign: 'right' }}>
                {pct(r.return_24h, 1)}
              </span>
              <span style={{ fontSize: 8.5, color: pctC(r.return_4h), fontFamily: C.font, textAlign: 'right' }}>
                {pct(r.return_4h, 1)}
              </span>
              <span style={{ fontSize: 8.5, color: pctC(r.return_1h), fontFamily: C.font, textAlign: 'right' }}>
                {pct(r.return_1h, 1)}
              </span>
            </div>
          );
        })}
        {data?.metadata && (
          <div style={{ padding: '4px 10px', fontSize: 7, color: C.dimLow, borderTop: `1px solid ${C.dimLow}`, marginTop: 'auto' }}>
            Benchmark: {data.metadata.benchmark}
          </div>
        )}
      </div>

      {/* ── Order Book Pressure ───────────────────────── */}
      <div style={cardStyle}>
        <div style={headerStyle(C.purple)}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5, color: C.purple, textTransform: 'uppercase' }}>
              Order Book Pressure
            </span>
            <SectionInfoTooltip title="Order Book Pressure" />
            <ChartBtn onClick={() => onChartOpen('Order Book Pressure', obPressure.map(r => cleanSym(r.symbol)))} />
          </div>
          <div style={{ fontSize: 7.5, color: C.dim, marginTop: 1 }}>Bid/ask depth imbalance</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '20px 52px 1fr 52px 48px 80px', padding: '3px 10px', background: '#060b14', borderBottom: `1px solid ${C.border}`, gap: 0 }}>
          <span style={colHeaderStyle}>#</span>
          <span style={colHeaderStyle}>COIN</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>PRESS</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>IMBAL</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>SPR</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>DIR</span>
        </div>
        {obPressure.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', fontSize: 8.5, color: C.dim }}>No data yet</div>
        ) : obPressure.map((r, i) => {
          const isSel = selectedCoin === r.symbol;
          const dirColor = OB_DIR_COLOR[r.direction] ?? C.dim;
          return (
            <div key={r.symbol} onClick={() => onSelect(r.symbol)}
              style={{ display: 'grid', gridTemplateColumns: '20px 52px 1fr 52px 48px 80px', padding: '3px 10px', cursor: 'pointer',
                background: isSel ? `${C.purple}18` : i % 2 === 0 ? C.bg : C.card2,
                borderBottom: `1px solid ${C.dimLow}`, alignItems: 'center', gap: 0, transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = `${C.purple}0c`; }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? C.bg : C.card2; }}>
              <span style={{ fontSize: 7.5, color: C.dimLow, fontFamily: C.font }}>{i + 1}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: isSel ? C.purple : C.text, fontFamily: C.font }}>{cleanSym(r.symbol)}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: (r.pressure_score ?? 0) >= 0 ? C.green : C.red, fontFamily: C.font, textAlign: 'right' }}>
                {r.pressure_score == null ? '—' : `${r.pressure_score >= 0 ? '+' : ''}${r.pressure_score.toFixed(2)}`}
              </span>
              <span style={{ fontSize: 8.5, color: (r.imbalance ?? 0) >= 0 ? C.green : C.red, fontFamily: C.font, textAlign: 'right' }}>
                {r.imbalance == null ? '—' : `${r.imbalance >= 0 ? '+' : ''}${r.imbalance.toFixed(2)}`}
              </span>
              <span style={{ fontSize: 8.5, color: C.dim, fontFamily: C.font, textAlign: 'right' }}>
                {nf(r.spread != null ? r.spread * 100 : null, 2, '%')}
              </span>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: dirColor, background: `${dirColor}18`,
                border: `1px solid ${dirColor}44`, borderRadius: 3, padding: '1px 5px', textAlign: 'center',
                justifySelf: 'end', whiteSpace: 'nowrap' }}>
                {r.direction}
              </span>
            </div>
          );
        })}
        {data?.metadata && (
          <div style={{ padding: '4px 10px', fontSize: 7, color: C.dimLow, borderTop: `1px solid ${C.dimLow}`, marginTop: 'auto' }}>
            Depth window: {data.metadata.depth_window_bps} bps
          </div>
        )}
      </div>

      {/* ── OI Regime Shift ───────────────────────────── */}
      <div style={cardStyle}>
        <div style={headerStyle(C.amber)}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5, color: C.amber, textTransform: 'uppercase' }}>
              OI Regime Shift
            </span>
            <SectionInfoTooltip title="OI Regime Shift" />
            <ChartBtn onClick={() => onChartOpen('OI Regime Shift', oiRegime.map(r => cleanSym(r.symbol)))} />
          </div>
          <div style={{ fontSize: 7.5, color: C.dim, marginTop: 1 }}>Trend vs squeeze classification</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '20px 52px 80px 1fr 48px 52px', padding: '3px 10px', background: '#060b14', borderBottom: `1px solid ${C.border}`, gap: 0 }}>
          <span style={colHeaderStyle}>#</span>
          <span style={colHeaderStyle}>COIN</span>
          <span style={colHeaderStyle}>REGIME</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>PRICE</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>OI</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>VOL</span>
        </div>
        {oiRegime.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', fontSize: 8.5, color: C.dim }}>No data yet</div>
        ) : oiRegime.map((r, i) => {
          const isSel = selectedCoin === r.symbol;
          const regColor = REGIME_COLOR[r.regime] ?? C.dim;
          return (
            <div key={r.symbol} onClick={() => onSelect(r.symbol)}
              style={{ display: 'grid', gridTemplateColumns: '20px 52px 80px 1fr 48px 52px', padding: '3px 10px', cursor: 'pointer',
                background: isSel ? `${C.amber}18` : i % 2 === 0 ? C.bg : C.card2,
                borderBottom: `1px solid ${C.dimLow}`, alignItems: 'center', gap: 0, transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = `${C.amber}0c`; }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? C.bg : C.card2; }}>
              <span style={{ fontSize: 7.5, color: C.dimLow, fontFamily: C.font }}>{i + 1}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: isSel ? C.amber : C.text, fontFamily: C.font }}>{cleanSym(r.symbol)}</span>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: regColor, background: `${regColor}18`,
                border: `1px solid ${regColor}44`, borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                {r.regime}
              </span>
              <span style={{ fontSize: 8.5, color: pctC(r.price_change_1h_pct), fontFamily: C.font, textAlign: 'right' }}>
                {pct(r.price_change_1h_pct, 1)}
              </span>
              <span style={{ fontSize: 8.5, color: pctC(r.oi_change_1h_pct), fontFamily: C.font, textAlign: 'right' }}>
                {pct(r.oi_change_1h_pct, 1)}
              </span>
              <span style={{ fontSize: 8.5, color: (r.volume_impulse ?? 0) >= 1.5 ? C.teal : C.dim, fontFamily: C.font, textAlign: 'right' }}>
                {nf(r.volume_impulse, 1, '×')}
              </span>
            </div>
          );
        })}
        {data?.as_of && (
          <div style={{ padding: '4px 10px', fontSize: 7, color: C.dimLow, borderTop: `1px solid ${C.dimLow}`, marginTop: 'auto' }}>
            As of {new Date(data.as_of).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* ── OI Cap Risk ──────────────────────────────── */}
      <div style={cardStyle}>
        <div style={headerStyle(C.red)}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5, color: C.red, textTransform: 'uppercase' }}>
              OI Cap Risk
            </span>
            <SectionInfoTooltip title="OI Cap Risk" />
            <ChartBtn onClick={() => onChartOpen('OI Cap Risk', oiCapRisk.map(r => cleanSym(r.symbol)))} />
          </div>
          <div style={{ fontSize: 7.5, color: C.dim, marginTop: 1 }}>Open interest crowding / cap utilization</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '20px 52px 1fr 74px 60px', padding: '3px 10px', background: '#060b14', borderBottom: `1px solid ${C.border}`, gap: 0 }}>
          <span style={colHeaderStyle}>#</span>
          <span style={colHeaderStyle}>COIN</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>UTIL %</span>
          <span style={colHeaderStyle}>STATUS</span>
          <span style={{ ...colHeaderStyle, textAlign: 'right' }}>REMAIN</span>
        </div>
        {oiCapRisk.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', fontSize: 8.5, color: C.dim }}>No cap-eligible markets</div>
        ) : oiCapRisk.map((r, i) => {
          const isSel = selectedCoin === r.symbol;
          const statColor = CAP_STATUS_COLOR[r.status] ?? C.dim;
          const utilColor = r.utilization >= 0.95 ? C.red : r.utilization >= 0.85 ? '#f97316' : r.utilization >= 0.70 ? C.amber : C.green;
          const fmtCap = (v: number) => {
            if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
            if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
            if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
            return `$${v.toFixed(0)}`;
          };
          return (
            <div key={r.symbol} onClick={() => onSelect(r.symbol)}
              style={{ display: 'grid', gridTemplateColumns: '20px 52px 1fr 74px 60px', padding: '3px 10px', cursor: 'pointer',
                background: isSel ? `${C.red}18` : i % 2 === 0 ? C.bg : C.card2,
                borderBottom: `1px solid ${C.dimLow}`, alignItems: 'center', gap: 0, transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = `${C.red}0c`; }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? C.bg : C.card2; }}>
              <span style={{ fontSize: 7.5, color: C.dimLow, fontFamily: C.font }}>{i + 1}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: isSel ? C.red : C.text, fontFamily: C.font }}>{cleanSym(r.symbol)}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: utilColor, fontFamily: C.font, textAlign: 'right' }}>
                {nf(r.utilization_pct, 1, '%')}
              </span>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: statColor, background: `${statColor}18`,
                border: `1px solid ${statColor}44`, borderRadius: 3, padding: '1px 5px', textAlign: 'center',
                justifySelf: 'start', whiteSpace: 'nowrap' }}>
                {r.status}
              </span>
              <span style={{ fontSize: 8.5, color: C.dim, fontFamily: C.font, textAlign: 'right' }}>
                {fmtCap(r.cap_remaining)}
              </span>
            </div>
          );
        })}
        {data?.as_of && (
          <div style={{ padding: '4px 10px', fontSize: 7, color: C.dimLow, borderTop: `1px solid ${C.dimLow}`, marginTop: 'auto' }}>
            Thresholds: 70% / 85% / 95%
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Momentum Panel (TSMOM) ───────────────────────────────────────────────────
type TsmomSK = 'default' | 'coin' | 's_adj' | 'side' | 'sigma' | 'momentum_10d' | 'momentum_30d' | 'funding_bps' | 'w_scaled';

function MomentumPanel({ selectedCoin, onSelect, onChartOpen }: {
  selectedCoin: string | null;
  onSelect: (coin: string) => void;
  onChartOpen: (title: string, coins: string[]) => void;
}) {
  const [open,    setOpen]    = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [sortKey, setSortKey] = useState<TsmomSK>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: rawTsmom, isLoading, isError } = useQuery<TsmomResult>({
    queryKey: ['tsmom-signals'],
    queryFn: async () => {
      const r = await fetch('/api/hyperliquid/tsmom-signals?top_n=60');
      if (!r.ok) throw new Error(`TSMOM ${r.status}`);
      return r.json();
    },
    refetchInterval: (query: any) => {
      const d = query?.state?.data as TsmomResult | undefined;
      return !d || d.signals.length === 0 ? 12_000 : 60_000;
    },
    staleTime: 11_000,
    gcTime: 60 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(3000 * (attempt + 1), 15000),
    refetchOnWindowFocus: false,
    placeholderData: (prev: any) => prev,
  });

  // ── Persistent last-good cache ─────────────────────────────────────────────
  const _lastGoodTsmom = useRef<TsmomResult | null>(null);
  if (_lastGoodTsmom.current === null) {
    try { const c = localStorage.getItem('hl_tsmom_cache'); if (c) _lastGoodTsmom.current = JSON.parse(c); } catch {}
  }
  if ((rawTsmom?.signals?.length ?? 0) > 0) {
    _lastGoodTsmom.current = rawTsmom!;
    try { localStorage.setItem('hl_tsmom_cache', JSON.stringify(rawTsmom)); } catch {}
  }
  const data = (rawTsmom?.signals?.length ?? 0) > 0 ? rawTsmom : (_lastGoodTsmom.current ?? rawTsmom);

  const signals = data?.signals ?? [];
  const meta    = data?.meta;

  // Sort the signals according to active column
  const sorted: TsmomSignal[] = useMemo(() => {
    if (sortKey === 'default') return signals;
    return [...signals].sort((a, b) => {
      let av: any = a[sortKey as keyof TsmomSignal];
      let bv: any = b[sortKey as keyof TsmomSignal];
      // String sort for coin / side
      if (typeof av === 'string' && typeof bv === 'string') {
        const d = av.localeCompare(bv);
        return sortDir === 'asc' ? d : -d;
      }
      // Numeric sort — nulls last
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const d = av - bv;
      return sortDir === 'asc' ? d : -d;
    });
  }, [signals, sortKey, sortDir]);

  const display = showAll ? sorted : sorted.slice(0, 20);

  // Toggle sort on column click
  const handleColSort = (key: TsmomSK) => {
    if (key === 'default') { setSortKey('default'); setSortDir('desc'); return; }
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
      setSortDir('desc');
      return key;
    });
  };

  // Signal bar: -2 to +2 mapped to 0%..100%
  const sigBar = (s: number) => ((s + 2) / 4) * 100;

  // Grid layout — signal bar takes all available space via 1fr
  const GRID = '24px 72px 1fr 80px 60px 60px 60px 60px 60px';

  // Column definitions: label, sortKey, alignment
  const COLS: { label: string; key: TsmomSK; align: 'left' | 'center' | 'right' }[] = [
    { label: '#',     key: 'default',      align: 'left'   },
    { label: 'COIN',  key: 'coin',         align: 'left'   },
    { label: 'SIGNAL',key: 's_adj',        align: 'center' },
    { label: 'SIDE',  key: 'side',         align: 'center' },
    { label: 'VOL%',  key: 'sigma',        align: 'right'  },
    { label: '10D%',  key: 'momentum_10d', align: 'right'  },
    { label: '30D%',  key: 'momentum_30d', align: 'right'  },
    { label: 'FUND',  key: 'funding_bps',  align: 'right'  },
    { label: 'W%',    key: 'w_scaled',     align: 'right'  },
  ];

  return (
    <div style={{ margin: '0 14px 14px', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
      {/* Section header — div so ChartBtn can sit alongside the collapse toggle without invalid nesting */}
      <div style={{ display: 'flex', alignItems: 'center', background: C.card2,
        borderBottom: open ? `1px solid ${C.border}` : 'none' }}>
        <div role="button" tabIndex={0} onClick={() => setOpen(o => !o)}
          onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px 7px 12px',
            cursor: 'pointer', color: C.text }}>
          <TrendingUp style={{ width: 11, height: 11, color: C.purple }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: C.purple, textTransform: 'uppercase' }}>
            Time-Series Momentum
          </span>
          <span style={{ fontSize: 8, color: C.dim, marginLeft: 2 }}>TSMOM · Multi-Lookback z-Score</span>
          {meta && (
            <span style={{ fontSize: 8, color: C.dim, marginLeft: 6 }}>
              <span style={{ color: C.green }}>{meta.long_count}↑</span>
              {' / '}
              <span style={{ color: C.red }}>{meta.short_count}↓</span>
              {' / '}
              <span style={{ color: C.dim }}>{meta.flat_count}·</span>
              {' · '}
              {meta.total_signals} signals
            </span>
          )}
          {isLoading && <span style={{ fontSize: 8, color: C.amber, marginLeft: 6 }}>Loading…</span>}
          {isError   && <span style={{ fontSize: 8, color: C.red,   marginLeft: 6 }}>No data yet — loading 1d candles</span>}
          <span style={{ marginLeft: 'auto', color: C.dim }}>
            {open ? <ChevronUp style={{ width: 11, height: 11 }} /> : <ChevronDown style={{ width: 11, height: 11 }} />}
          </span>
        </div>
        {signals.length > 0 && (
          <div style={{ paddingRight: 10 }}>
            <ChartBtn onClick={() => onChartOpen('Time-Series Momentum', display.map(s => s.coin))} />
          </div>
        )}
      </div>

      {open && (
        <div>
          {/* Sortable column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: GRID,
            padding: '4px 12px', background: '#060b14', borderBottom: `1px solid ${C.border}`, gap: 0 }}>
            {COLS.map(col => {
              const isActive = sortKey === col.key;
              const arrow = isActive ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '';
              return (
                <button key={col.key} onClick={() => handleColSort(col.key)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 7.5, fontWeight: 700, letterSpacing: 1,
                    color: isActive ? C.teal : C.dim,
                    textAlign: col.align, paddingRight: col.align === 'right' ? 8 : 0,
                    fontFamily: C.font, userSelect: 'none' }}>
                  {col.label}{arrow}
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          {display.length === 0 && !isLoading && (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 9, color: C.dim }}>
              {isError
                ? 'Error loading TSMOM signals — retrying in 8s…'
                : 'Computing momentum signals — 1d candle data loading in background. Auto-refreshes every 60s.'}
            </div>
          )}

          {/* Signal rows */}
          {display.map((sig, i) => {
            const isSel  = selectedCoin === sig.coin;
            const sColor = sig.s_adj > 0.15 ? C.green : sig.s_adj < -0.15 ? C.red : C.dim;
            const barPct = sigBar(sig.s_adj);
            return (
              <div key={`${sig.coin}_${i}`} onClick={() => onSelect(sig.coin)}
                style={{ display: 'grid', gridTemplateColumns: GRID,
                  padding: '3px 12px',
                  background: isSel ? `${C.purple}18` : i % 2 === 0 ? C.bg : C.card2,
                  cursor: 'pointer', borderBottom: `1px solid ${C.dimLow}`,
                  alignItems: 'center', gap: 0 }}
                onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = `${C.purple}0c`; }}
                onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? C.bg : C.card2; }}>
                {/* Rank */}
                <span style={{ fontSize: 7.5, color: C.dimLow, fontFamily: C.font }}>{i + 1}</span>
                {/* Coin */}
                <span style={{ fontSize: 9.5, fontWeight: 700, color: isSel ? C.purple : C.text, fontFamily: C.font }}>{sig.coin}</span>
                {/* Signal bar — fills 1fr */}
                <div style={{ position: 'relative', height: 12, background: C.dimLow, borderRadius: 2, overflow: 'hidden', marginRight: 8 }}>
                  <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: C.border, zIndex: 1 }} />
                  <div style={{
                    position: 'absolute',
                    left:  sig.s_adj >= 0 ? '50%' : `${barPct}%`,
                    width: `${Math.abs(sig.s_adj) / 4 * 100}%`,
                    top: 0, height: '100%',
                    background: sColor, opacity: 0.85, borderRadius: 1,
                  }} />
                  <span style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7.5, fontWeight: 700, color: '#fff', fontFamily: C.font, zIndex: 2,
                    textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                    {sig.s_adj >= 0 ? '+' : ''}{sig.s_adj.toFixed(2)}
                  </span>
                </div>
                {/* Side */}
                <span style={{ fontSize: 8, fontWeight: 700, color: sColor, fontFamily: C.font, textAlign: 'center', letterSpacing: 0.5 }}>
                  {sig.side === 'long' ? '▲ LONG' : sig.side === 'short' ? '▼ SHORT' : '· FLAT'}
                </span>
                {/* VOL% */}
                <span style={{ fontSize: 8.5, color: C.amber, fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.sigma.toFixed(0)}%
                </span>
                {/* 10D% */}
                <span style={{ fontSize: 8.5, color: sig.momentum_10d == null ? C.dim : sig.momentum_10d >= 0 ? C.green : C.red,
                  fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.momentum_10d == null ? '—' : `${sig.momentum_10d >= 0 ? '+' : ''}${sig.momentum_10d.toFixed(1)}%`}
                </span>
                {/* 30D% */}
                <span style={{ fontSize: 8.5, color: sig.momentum_30d == null ? C.dim : sig.momentum_30d >= 0 ? C.green : C.red,
                  fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.momentum_30d == null ? '—' : `${sig.momentum_30d >= 0 ? '+' : ''}${sig.momentum_30d.toFixed(1)}%`}
                </span>
                {/* FUND */}
                <span style={{ fontSize: 8.5, color: sig.funding_bps > 1 ? C.red : sig.funding_bps < -1 ? C.blue : C.dim,
                  fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.funding_bps >= 0 ? '+' : ''}{sig.funding_bps.toFixed(2)}
                </span>
                {/* W% */}
                <span style={{ fontSize: 8.5, fontWeight: 700, color: sColor,
                  fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.w_scaled >= 0 ? '+' : ''}{sig.w_scaled.toFixed(1)}%
                </span>
              </div>
            );
          })}

          {/* Footer — show more + legend */}
          {signals.length > 0 && (
            <div style={{ padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 12,
              background: '#060b14', borderTop: `1px solid ${C.dimLow}` }}>
              {signals.length > 20 && (
                <button onClick={() => setShowAll(s => !s)}
                  style={{ fontSize: 8.5, color: C.teal, background: 'none', border: `1px solid ${C.border}`,
                    borderRadius: 3, padding: '2px 8px', cursor: 'pointer' }}>
                  {showAll ? 'Show Top 20' : `Show All ${signals.length}`}
                </button>
              )}
              <span style={{ fontSize: 7.5, color: C.dim }}>
                Signal = avg z-score (10d/30d/90d) adjusted for funding carry · Vol-targeted weight at 40% target
              </span>
              {meta && (
                <span style={{ fontSize: 7.5, color: C.dimLow, marginLeft: 'auto' }}>
                  {new Date(meta.generated_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Market Matrix Section (tabbed, backend-driven) ─────────────────────────
interface MatrixAsset {
  coin?: string;
  display_name?: string;
  asset_type?: string;
  category_source?: string;
  mark?: number | null;
  oracle?: number | null;
  mid?: number | null;
  prev_day_px?: number | null;
  change_24h_pct?: number | null;
  funding?: number | null;
  funding_annualized_pct?: number | null;
  open_interest_usd?: number | null;
  volume_24h_usd?: number | null;
  premium_pct?: number | null;
  mark_oracle_pct?: number | null;
  book_imbalance?: number | null;
  trade_imbalance?: number | null;
  vol_score?: number | null;
  signal?: number | null;
  agent_score?: number | null;
  agent_rank?: number | null;
  max_leverage?: number | null;
  is_active?: boolean;
  // Signal-layer fields (snake_case from /market-matrix endpoint)
  matrix_signal?: string | null;
  matrix_reason?: string | null;
  matrix_detail?: string | null;
  opportunity_score?: number | null;
  risk_score?: number | null;
  risk_label?: string | null;
  risk_reason?: string | null;
  funding_label?: string | null;
  funding_reason?: string | null;
  flow_label?: string | null;
  flow_reason?: string | null;
  oi_delta_15m_pct?: number | null;
  oi_delta_1h_pct?: number | null;
  volume_velocity_15m?: number | null;
  volume_velocity_1h?: number | null;
  long_liq_15m?: number | null;
  short_liq_15m?: number | null;
  liquidation_bias_15m?: string | null;
  liquidation_context?: string | null;
  vol_oi_ratio?: number | null;
}
interface MatrixTab { label: string; count: number; assets: MatrixAsset[] }
interface MatrixResponse {
  updated_at?: string;
  source?: string;
  tabs: Record<string, MatrixTab>;
  all_assets_count?: number;
  warnings?: string[];
}

interface MatCol2 {
  key: string;
  label: string;
  w: number;
  sortVal: (row: any) => any;
  render: (row: any) => ReactNode;
  align?: 'left' | 'right';
  tooltip?: string;
}

const MATRIX_COLS: MatCol2[] = [
  {
    key:'coin', label:'COIN', w:88, align:'left',
    sortVal: r => (r.coin ?? r.display_name ?? r.displayName ?? '').toLowerCase(),
    render:  r => <span style={{ fontWeight:700, color:C.text, fontFamily:C.font }}>{r.coin ?? r.display_name ?? r.displayName ?? '—'}</span>,
  },
  {
    key:'mark', label:'MARK', w:82,
    sortVal: r => r.mark ?? r.markPrice ?? null,
    render:  r => <span style={{ color:C.text }}>{px(r.mark ?? r.markPrice ?? null)}</span>,
  },
  {
    key:'change_24h_pct', label:'24H %', w:58,
    sortVal: r => r.change_24h_pct ?? r.change24hPct ?? null,
    render:  r => { const v = r.change_24h_pct ?? r.change24hPct ?? null; return <span style={{ color:pctC(v) }}>{pct(v,2)}</span>; },
  },
  {
    key:'open_interest_usd', label:'OI', w:72,
    tooltip: 'Open interest in USD.',
    sortVal: r => getOpenInterest(r),
    render:  r => <span style={{ color:C.text }}>{$$(getOpenInterest(r))}</span>,
  },
  {
    key:'oi_delta', label:'OI Δ', w:54,
    tooltip: 'Open interest % change (15m or 1h window).',
    sortVal: r => getOiDelta(r) ?? -Infinity,
    render:  r => {
      const v = getOiDelta(r);
      if (v == null) return <span style={{ color:C.dimLow }}>—</span>;
      return <span style={{ color: v > 0 ? C.green : v < 0 ? C.red : C.dim }}>{v >= 0 ? '+' : ''}{v.toFixed(1)}%</span>;
    },
  },
  {
    key:'volume_24h_usd', label:'VOL', w:72,
    tooltip: '24h notional volume.',
    sortVal: r => getVolume(r),
    render:  r => <span style={{ color:C.text }}>{$$(getVolume(r))}</span>,
  },
  {
    key:'vol_velocity', label:'V.VEL', w:50,
    tooltip: 'Recent volume vs expected baseline. 1x = normal, 2x+ = surge.',
    sortVal: r => getVolVelocity(r) ?? -Infinity,
    render:  r => {
      const v = getVolVelocity(r);
      if (v == null) return <span style={{ color:C.dimLow }}>—</span>;
      const col = v >= 2.0 ? C.green : v >= 1.2 ? C.teal : v < 0.8 ? C.dim : C.text;
      return <span style={{ color:col }}>{v.toFixed(1)}x</span>;
    },
  },
  {
    key:'funding', label:'FUNDING', w:80,
    sortVal: r => r.funding ?? null,
    render:  r => {
      const fund  = r.funding ?? null;
      const label = getFundingLabel(r);
      const reason = getFundingReason(r);
      const rateCol = fC(fund);
      return (
        <span title={reason||undefined} style={{ whiteSpace:'nowrap' }}>
          <span style={{ color:rateCol, fontFamily:C.font }}>{fmtF(fund)}</span>
          {label !== '—' && <span style={{ fontSize:7, color:C.dimLow, marginLeft:4 }}>{label}</span>}
        </span>
      );
    },
  },
  {
    key:'premium_pct', label:'PREM', w:58,
    tooltip: 'Mark vs spot/index premium %.',
    sortVal: r => { const raw = getPremium(r); return r.premium_pct != null ? r.premium_pct : raw != null && r.premium != null ? raw * 100 : raw; },
    render:  r => {
      const v = r.premium_pct != null ? r.premium_pct : r.premium != null ? r.premium * 100 : null;
      if (v == null) return <span style={{ color:C.dim }}>—</span>;
      return <span style={{ color:pctC(v) }}>{pct(v,3)}</span>;
    },
  },
  {
    key:'mark_oracle_pct', label:'MK/ORC', w:62,
    tooltip: 'Mark vs oracle price gap %.',
    sortVal: r => { const raw = getMarkOracle(r); return (r.mark_oracle_pct != null || r.markOracleDeltaPct != null || r.mark_oracle_delta_pct != null) ? raw : raw != null ? raw * 100 : null; },
    render:  r => {
      const v = r.mark_oracle_pct != null ? r.mark_oracle_pct : r.distMarkOracle != null ? r.distMarkOracle * 100 : null;
      if (v == null) return <span style={{ color:C.dim }}>—</span>;
      return <span style={{ color:pctC(v) }}>{pct(v,3)}</span>;
    },
  },
  {
    key:'book_imbalance', label:'BOOK', w:54,
    tooltip: 'Bid/ask depth imbalance. Positive = bid-heavy (buy pressure).',
    sortVal: r => getBook(r),
    render:  r => {
      const v = getBook(r);
      if (v == null) return <span style={{ color:C.dim }}>—</span>;
      return <span style={{ color: v > 0.1 ? C.green : v < -0.1 ? C.red : C.dim }}>{v.toFixed(2)}</span>;
    },
  },
  {
    key:'flow_label', label:'FLOW', w:58,
    tooltip: 'Tape / liquidation flow character.',
    sortVal: r => getFlowLabel(r),
    render:  r => {
      const label  = getFlowLabel(r);
      const reason = getFlowReason(r);
      if (label === '—') return <span style={{ color:C.dim }}>—</span>;
      const col = (label==='Buying'||label==='Building') ? C.green
                : (label==='Selling'||label==='Flush')   ? C.red
                : label==='Squeeze'                      ? C.amber
                : label==='Absorbing'                    ? C.teal
                : C.dim;
      return <span title={reason||undefined} style={{ color:col }}>{label}</span>;
    },
  },
  {
    key:'matrix_signal', label:'SIGNAL', w:64,
    tooltip: 'Matrix signal. Hover for reason.',
    sortVal: r => getMatrixSignal(r),
    render:  r => {
      const sig = getMatrixSignal(r);
      const col = sigColor(sig);
      const tip = [getMatrixReason(r), getMatrixDetail(r)].filter(Boolean).join(' · ') || undefined;
      if (sig === 'NEUTRAL') return <span style={{ color:C.dim }}>—</span>;
      return (
        <span title={tip} style={{ fontSize:8, fontWeight:800, color:col, background:`${col}18`, border:`1px solid ${col}44`, borderRadius:3, padding:'1px 5px', letterSpacing:0.3, whiteSpace:'nowrap' }}>{sig}</span>
      );
    },
  },
  {
    key:'risk_label', label:'RISK', w:62,
    tooltip: 'Risk classification. Hover for reason.',
    sortVal: r => getRiskScore(r) ?? 0,
    render:  r => {
      const label  = getRiskLabel(r);
      const score  = getRiskScore(r);
      const reason = getRiskReason(r);
      if (label === '—' && score == null) return <span style={{ color:C.dim }}>—</span>;
      const col = riskLabelColor(label);
      return (
        <span title={reason||undefined} style={{ color:col, whiteSpace:'nowrap' }}>
          {label !== '—' ? label : '—'}
          {score != null && <span style={{ fontSize:7, opacity:0.75, marginLeft:3 }}>{score.toFixed(2)}</span>}
        </span>
      );
    },
  },
  {
    key:'opportunity_score', label:'SCORE', w:50,
    tooltip: 'Opportunity score (0–1). Higher = stronger setup.',
    sortVal: r => getOpportunityScore(r),
    render:  r => {
      const v = getOpportunityScore(r);
      return <span style={{ fontSize:9, fontFamily:C.font, color:C.purple }}>{v > 0 ? v.toFixed(2) : '—'}</span>;
    },
  },
  {
    key:'agent_rank', label:'RANK', w:44,
    sortVal: r => r.agent_rank ?? r.agentRank ?? 9999,
    render:  r => <span style={{ color:C.dim }}>{r.agent_rank ?? r.agentRank ?? '—'}</span>,
  },
];

const MATRIX_TAB_ORDER: string[] = ['all', 'stocks_etfs', 'crypto', 'commodities', 'indices', 'pre_ipo', 'themes'];
const MATRIX_TAB_FALLBACK_LABELS: Record<string,string> = {
  all:          'All',
  stocks_etfs:  'Stocks',
  crypto:       'Crypto',
  commodities:  'Commodities',
  indices:      'Indices',
  pre_ipo:      'Pre-IPO Stocks',
  themes:       'Themes + ETFs',
};

// Frontend classifier: mirrors backend _classifyMatrixTab so the toggles still
// filter rows when the /market-matrix endpoint is unreachable. Keep in sync with
// frontend/server/routes.ts (MATRIX_SYMBOL_OVERRIDES / _classifyMatrixTab).
const MATRIX_SYMBOL_OVERRIDES_FE: Record<string, string> = {
  NATGAS: 'commodities', CL: 'commodities', BRENTOIL: 'commodities',
  WTI: 'commodities', OIL: 'commodities', GAS: 'commodities',
  COPPER: 'commodities', GOLD: 'commodities', SILVER: 'commodities',
  USOIL: 'commodities', USENERGY: 'commodities', WHEAT: 'commodities',
  SOY: 'commodities', CORN: 'commodities', PLATINUM: 'commodities',
  PALLADIUM: 'commodities',
  US500: 'indices', USA500: 'indices', SP500: 'indices', SPX: 'indices',
  USTECH: 'indices', USBOND: 'indices', SMALL2000: 'indices',
  NASDAQ: 'indices', NDX: 'indices', RUSSELL: 'indices',
  DAX: 'indices', NIKKEI: 'indices', EWY: 'indices', XYZ100: 'indices',
  BTC: 'crypto', ETH: 'crypto', SOL: 'crypto', HYPE: 'crypto',
  BNB: 'crypto', XRP: 'crypto', DOGE: 'crypto',
  TENCENT: 'stocks_etfs', XIAOMI: 'stocks_etfs', SMSN: 'stocks_etfs',
  GLDMINE: 'stocks_etfs', HYUNDAI: 'stocks_etfs',
  ANTHROPIC: 'pre_ipo', SPACEX: 'pre_ipo', OPENAI: 'pre_ipo', CEREBRAS: 'pre_ipo',
  ROBOT: 'themes', SEMI: 'themes',
};
function classifyScreenerRow(row: ScreenerRow): string {
  const sym = String(row?.coin ?? row?.displayName ?? '').toUpperCase();
  if (MATRIX_SYMBOL_OVERRIDES_FE[sym]) return MATRIX_SYMBOL_OVERRIDES_FE[sym];
  const cat = String(row?.category ?? '').toLowerCase();
  const tags: string[] = Array.isArray(row?.tags) ? row.tags.map(t => String(t).toLowerCase()) : [];
  const has = (s: string) => cat === s || tags.includes(s);
  if (has('theme') || has('themes'))                 return 'themes';
  if (has('pre-ipo') || has('preipo'))               return 'pre_ipo';
  if (has('commodity') || has('commodities'))        return 'commodities';
  if (has('index') || has('indices'))                return 'indices';
  if (has('equity') || has('stock') || has('etf'))   return 'stocks_etfs';
  if (cat === 'l1' || cat === 'defi' || cat === 'ai' || cat === 'meme' ||
      cat === 'gaming' || cat === 'rwa' || has('crypto')) return 'crypto';
  return 'crypto';
}

// ─── Matrix Chart Resolution ──────────────────────────────────────────────────

const MATRIX_COMMODITY_TV: Record<string, string> = {
  BRENTOIL:'TVC:UKOIL',  BRENT:'TVC:UKOIL',    UKOIL:'TVC:UKOIL',
  WTIOIL:'TVC:USOIL',    CL:'TVC:USOIL',        OIL:'TVC:USOIL',
  USOIL:'TVC:USOIL',     CRUDEOIL:'TVC:USOIL',
  NATGAS:'FXOPEN:XNGUSD', GAS:'FXOPEN:XNGUSD',  NATURALGAS:'FXOPEN:XNGUSD',
  GOLD:'OANDA:XAUUSD',   XAUUSD:'OANDA:XAUUSD',
  SILVER:'TVC:SILVER',   XAGUSD:'TVC:SILVER',
  COPPER:'CAPITALCOM:COPPER',
  PLATINUM:'CAPITALCOM:PLATINUM', XPTUSD:'CAPITALCOM:PLATINUM',
  PALLADIUM:'OANDA:XPDUSD', XPDUSD:'OANDA:XPDUSD',
  WHEAT:'OANDA:WHEATUSD', CORN:'OANDA:CORNUSD',
  SOY:'OANDA:SOYBNUSD',  SOYBEAN:'OANDA:SOYBNUSD', SOYBEANS:'OANDA:SOYBNUSD',
  COFFEE:'ICEEUR:KC1!',  SUGAR:'ICEEUR:SB1!',   LUMBER:'CME:LB1!',
  URANIUM:'COMEX:UX1!',
};

const MATRIX_INDEX_TV: Record<string, string> = {
  US500:'SP:SPX',    USA500:'SP:SPX',   SP500:'SP:SPX',    SPX:'SP:SPX',
  USTECH:'NASDAQ:NDX', USA100:'NASDAQ:NDX', NASDAQ:'NASDAQ:NDX', NDX:'NASDAQ:NDX', XYZ100:'NASDAQ:NDX',
  SMALL2000:'TVC:RUT', RUSSELL:'TVC:RUT',
  USBOND:'TVC:US10Y',
  DAX:'XETR:DAX',
  NIKKEI:'INDEX:NKY', JP225:'INDEX:NKY',
  EWY:'AMEX:EWY',    EWJ:'AMEX:EWJ',    EWZ:'AMEX:EWZ',
  KR200:'KRXINDEX:200',
};

// Hyperliquid theme symbol → best-fit TradingView ETF symbol
// (ETF tickers sourced from THEME_ETF_TV in stocks-sectors.tsx)
const MATRIX_THEME_TV: Record<string, string> = {
  SEMI:'NASDAQ:SMH',     SEMIS:'NASDAQ:SMH',     SEMICONDUCTOR:'NASDAQ:SMH',
  DRAM:'NASDAQ:SMH',     MEMORY:'NASDAQ:SMH',
  ROBOT:'NASDAQ:BOTZ',   ROBOTICS:'NASDAQ:BOTZ',
  MAG7:'NASDAQ:MAGS',    MAGS:'NASDAQ:MAGS',
  ENERGY:'AMEX:XLE',
  DEFENSE:'AMEX:ITA',    AEROSPACE:'AMEX:XAR',
  NUCLEAR:'AMEX:URA',    URANIUM_ETF:'AMEX:URA',
  INFOTECH:'AMEX:XLK',   TECH:'NASDAQ:QQQ',
  BIOTECH:'AMEX:XBI',
  CLOUD:'NASDAQ:SKYY',
  CYBER:'NASDAQ:CIBR',   CYBERSECURITY:'NASDAQ:CIBR',
  CLEANENERGY:'NASDAQ:ICLN', SOLAR:'AMEX:TAN',
  MINERS:'AMEX:GDX',
  FINTECH:'NASDAQ:FINX',
  AI:'NASDAQ:BOTZ',
};

// Known non-US / exchange-specific stock overrides
const MATRIX_STOCK_TV: Record<string, string> = {
  TENCENT:'OTC:TCEHY', XIAOMI:'HKEX:1810', SMSN:'LSE:SMSN',
  GLDMINE:'AMEX:GDX',  HYUNDAI:'OTC:HYMTF',
  BABA:'NYSE:BABA',    TSM:'NYSE:TSM',     MSTR:'NASDAQ:MSTR',
};

type MatrixChartResult =
  | { type: 'tradingview'; symbol: string; title: string }
  | { type: 'hyperliquid'; coin: string;   title: string };

function resolveMatrixChart(asset: MatrixAsset, activeTab: string): MatrixChartResult {
  const sym   = (asset.coin ?? '').toUpperCase();
  const title = asset.display_name ?? asset.coin ?? sym;

  if (activeTab === 'commodities') {
    return { type:'tradingview', symbol: MATRIX_COMMODITY_TV[sym] ?? sym, title };
  }
  if (activeTab === 'indices') {
    return { type:'tradingview', symbol: MATRIX_INDEX_TV[sym] ?? sym, title };
  }
  if (activeTab === 'themes') {
    return { type:'tradingview', symbol: MATRIX_THEME_TV[sym] ?? sym, title };
  }
  if (activeTab === 'stocks_etfs') {
    return { type:'tradingview', symbol: MATRIX_STOCK_TV[sym] ?? sym, title };
  }
  // crypto + pre_ipo → Hyperliquid native candles
  return { type:'hyperliquid', coin: asset.coin ?? sym, title };
}

function buildTvEmbedUrl(symbol: string): string {
  return (
    'https://s.tradingview.com/embed-widget/advanced-chart/?locale=en' +
    '&width=100%25&height=480&interval=D&range=3M&style=1&toolbar_bg=0d1623' +
    '&enable_publishing=false&withdateranges=true&hide_side_toolbar=false' +
    '&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark' +
    '&timezone=exchange&hide_top_toolbar=false' +
    '&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D' +
    '&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D' +
    `&symbol=${encodeURIComponent(symbol)}`
  );
}

function MatrixChartModal({ asset, activeTab, onClose }: {
  asset: MatrixAsset; activeTab: string; onClose: () => void;
}) {
  const resolved = resolveMatrixChart(asset, activeTab);
  const [iv, setIv] = useState<ChartInterval>('1d');

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.78)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <div
        style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, width:640, maxWidth:'96vw', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderBottom:`1px solid ${C.border}`, flexShrink:0, background:C.card2 }}>
          <BarChart2 style={{ width:11, height:11, color:C.teal }} />
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:C.teal, textTransform:'uppercase' }}>{resolved.title}</span>
          {resolved.type === 'hyperliquid' && (
            <div style={{ marginLeft:8, display:'flex', gap:4 }}>
              {(['15m','1h','4h','1d'] as ChartInterval[]).map(t => (
                <button key={t} onClick={() => setIv(t)}
                  style={{ fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:3, cursor:'pointer', fontFamily:C.font,
                    background: iv===t ? `${C.teal}22` : 'none',
                    border: `1px solid ${iv===t ? C.teal : C.border}`,
                    color: iv===t ? C.teal : C.dim }}>
                  {t}
                </button>
              ))}
            </div>
          )}
          {resolved.type === 'tradingview' && (
            <span style={{ fontSize:8, color:C.dim, fontFamily:C.font, marginLeft:4 }}>{resolved.symbol}</span>
          )}
          <button onClick={onClose}
            style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.dim, padding:2, display:'flex' }}>
            <X style={{ width:14, height:14 }} />
          </button>
        </div>
        {/* Body */}
        <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
          {resolved.type === 'tradingview' && (
            <iframe
              key={resolved.symbol}
              src={buildTvEmbedUrl(resolved.symbol)}
              style={{ width:'100%', height:480, border:'none', display:'block' }}
              title={`${resolved.title} chart`}
            />
          )}
          {resolved.type === 'hyperliquid' && (
            <div style={{ overflowY:'auto', maxHeight:'80vh' }}>
              <div style={{ paddingTop:6 }}>
                <CoinChartPanel coin={resolved.coin} interval={iv} />
              </div>
              {/* ── Market data grid ── */}
              <div style={{ padding:'10px 16px 6px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px 14px' }}>
                  {([
                    ['Mark',      asset.mark           != null ? px(asset.mark)              : '—',  undefined],
                    ['Oracle',    asset.oracle         != null ? px(asset.oracle)            : '—',  undefined],
                    ['24H %',     asset.change_24h_pct != null ? pct(asset.change_24h_pct,2) : '—',  pctC(asset.change_24h_pct??null)],
                    ['Funding/hr',asset.funding        != null ? fmtF(asset.funding)         : '—',  fC(asset.funding??null)],
                    ['OI',        $$(getOpenInterest(asset)),                                         undefined],
                    ['Volume',    $$(getVolume(asset)),                                               undefined],
                    ['OI Δ',      getOiDelta(asset) != null ? `${getOiDelta(asset)!>=0?'+':''}${getOiDelta(asset)!.toFixed(1)}%` : '—', pctC(getOiDelta(asset))],
                    ['Vol Vel',   getVolVelocity(asset) != null ? `${getVolVelocity(asset)!.toFixed(1)}x` : '—', getVolVelocity(asset)!=null&&getVolVelocity(asset)!>=1.5?C.green:C.dim],
                    ['Premium',   asset.premium_pct != null ? pct(asset.premium_pct,3) : '—',        pctC(asset.premium_pct??null)],
                    ['Mk/Oracle', asset.mark_oracle_pct != null ? pct(asset.mark_oracle_pct,3) : '—',pctC(asset.mark_oracle_pct??null)],
                    ['Book',      getBook(asset) != null ? getBook(asset)!.toFixed(2) : '—',         getBook(asset)!=null?(getBook(asset)!>0.1?C.green:getBook(asset)!<-0.1?C.red:C.dim):C.dim],
                  ] as [string, string, string|undefined][]).map(([label, val, vc]) => (
                    <div key={label} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <span style={{ fontSize:7.5, fontWeight:700, letterSpacing:1, color:C.dim, textTransform:'uppercase' }}>{label}</span>
                      <span style={{ fontSize:10, fontWeight:600, color:vc??C.text, fontFamily:C.font }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* ── Signal context block ── */}
              {(getMatrixSignal(asset) !== 'NEUTRAL' || !!getMatrixReason(asset) || getFundingLabel(asset) !== '—' || getFlowLabel(asset) !== '—') && (
                <div style={{ margin:'0 16px 10px', borderTop:`1px solid ${C.dimLow}`, paddingTop:8 }}>
                  <div style={{ fontSize:7, color:C.dim, letterSpacing:1.5, textTransform:'uppercase', fontWeight:700, marginBottom:5 }}>Signal Context</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center', marginBottom:5 }}>
                    {(() => { const s = getMatrixSignal(asset); const col = sigColor(s); return s !== 'NEUTRAL' ? <span style={{ fontSize:8.5, fontWeight:800, color:col, background:`${col}18`, border:`1px solid ${col}44`, borderRadius:3, padding:'1px 6px' }}>{s}</span> : null; })()}
                    {getFundingLabel(asset) !== '—' && <span style={{ fontSize:8, color:C.dim, background:`${C.dimLow}22`, borderRadius:3, padding:'1px 5px' }}>Funding: {getFundingLabel(asset)}</span>}
                    {getFlowLabel(asset) !== '—' && <span style={{ fontSize:8, color:C.dim, background:`${C.dimLow}22`, borderRadius:3, padding:'1px 5px' }}>Flow: {getFlowLabel(asset)}</span>}
                    {getRiskLabel(asset) !== '—' && <span style={{ fontSize:8, color:riskLabelColor(getRiskLabel(asset)), background:`${riskLabelColor(getRiskLabel(asset))}18`, borderRadius:3, padding:'1px 5px' }}>Risk: {getRiskLabel(asset)}{getRiskScore(asset) != null ? ` ${getRiskScore(asset)!.toFixed(2)}` : ''}</span>}
                  </div>
                  {getMatrixReason(asset) && <div style={{ fontSize:8, color:C.text, lineHeight:1.55, marginBottom:2 }}>{getMatrixReason(asset)}</div>}
                  {getMatrixDetail(asset) && <div style={{ fontSize:7.5, color:C.dim, lineHeight:1.55, marginBottom:2 }}>{getMatrixDetail(asset)}</div>}
                  {getFundingReason(asset) && <div style={{ fontSize:7.5, color:C.dimLow, lineHeight:1.5, marginBottom:1 }}>Funding: {getFundingReason(asset)}</div>}
                  {getFlowReason(asset) && <div style={{ fontSize:7.5, color:C.dimLow, lineHeight:1.5, marginBottom:1 }}>Flow: {getFlowReason(asset)}</div>}
                  {getRiskReason(asset) && <div style={{ fontSize:7.5, color:C.dimLow, lineHeight:1.5, marginBottom:1 }}>Risk: {getRiskReason(asset)}</div>}
                  {(asset as any).long_liq_15m  != null && <div style={{ fontSize:7.5, color:C.red,   lineHeight:1.5 }}>Long liq 15m: {$$((asset as any).long_liq_15m)}</div>}
                  {(asset as any).short_liq_15m != null && <div style={{ fontSize:7.5, color:C.green, lineHeight:1.5 }}>Short liq 15m: {$$((asset as any).short_liq_15m)}</div>}
                  {(asset as any).liquidation_context && <div style={{ fontSize:7.5, color:C.dim, lineHeight:1.5 }}>{(asset as any).liquidation_context}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketMatrixSection({ search, fallbackRows }: { search: string; fallbackRows: ScreenerRow[] }) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sortKey, setSortKey]     = useState<string>('opportunity_score');
  const [sortDir, setSortDir]     = useState<'asc'|'desc'>('desc');
  const [sigFilter, setSigFilter] = useState<string>('all');
  const [showMatrix] = useState(true);
  const [matrixChart, setMatrixChart] = useState<{ asset: MatrixAsset; tab: string } | null>(null);

  const { data, isLoading, isError } = useQuery<MatrixResponse>({
    queryKey: ['hl-market-matrix'],
    queryFn: async () => {
      const r = await fetch('/api/hyperliquid/screener/market-matrix');
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      return r.json();
    },
    refetchInterval: 20_000,
    staleTime: 18_000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (prev: any) => prev,
  });

  const tabs = data?.tabs ?? {};
  const orderedKeys = useMemo(() => {
    const known = MATRIX_TAB_ORDER.filter(k => k in tabs);
    const extras = Object.keys(tabs).filter(k => !MATRIX_TAB_ORDER.includes(k));
    return [...known, ...extras];
  }, [tabs]);

  const totalTabbedRows = useMemo(
    () => Object.values(tabs).reduce((sum, t) => sum + ((t?.assets?.length) ?? 0), 0),
    [tabs]
  );

  // Use the new tabbed endpoint when it has any usable rows; otherwise fall back.
  const useTabbed = !!data && orderedKeys.length > 0 && totalTabbedRows > 0;

  const currentKey = activeTab === 'all' ? (orderedKeys[0] ?? 'stocks_etfs') : ((activeTab in tabs) ? activeTab : (orderedKeys[0] ?? 'stocks_etfs'));
  const assets: MatrixAsset[] = activeTab === 'all'
    ? Object.values(tabs).flatMap(t => t?.assets ?? [])
    : (tabs[currentKey]?.assets ?? []);

  const filteredTabbed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = assets;
    if (q) result = result.filter(a =>
      (a.coin ?? '').toLowerCase().includes(q) ||
      (a.display_name ?? '').toLowerCase().includes(q)
    );
    if (sigFilter !== 'all') result = result.filter(a => getMatrixSignal(a) === sigFilter);
    return result;
  }, [assets, search, sigFilter]);

  const sortedTabbed = useMemo(() => {
    const col = MATRIX_COLS.find(c => c.key === sortKey);
    const getSV = col?.sortVal ?? ((row: any) => (row as any)[sortKey]);
    const cmp = (a: MatrixAsset, b: MatrixAsset) => {
      const av = getSV(a), bv = getSV(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const d = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? d : -d;
    };
    return [...filteredTabbed].sort(cmp);
  }, [filteredTabbed, sortKey, sortDir]);

  const handleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
      setSortDir(key === 'coin' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  // ── Fallback rendering data (uses parent's already-sorted ScreenerRow rows) ──
  // Classify each row into one of the 5 asset-class tabs so toggles still work
  // when the /market-matrix endpoint is unreachable.
  const fallbackByTab = useMemo(() => {
    const buckets: Record<string, ScreenerRow[]> = {
      stocks_etfs: [], crypto: [], commodities: [], indices: [], pre_ipo: [], themes: [], all: [],
    };
    for (const r of fallbackRows) {
      const k = classifyScreenerRow(r);
      (buckets[k] ?? (buckets[k] = [])).push(r);
    }
    return buckets;
  }, [fallbackRows]);

  const fallbackTabCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const k of MATRIX_TAB_ORDER) out[k] = (fallbackByTab[k] ?? []).length;
    return out;
  }, [fallbackByTab]);

  const fallbackFiltered = useMemo(() => {
    const rows = activeTab === 'all' ? fallbackRows : (fallbackByTab[activeTab] ?? []);
    const q = search.trim().toLowerCase();
    let result = rows;
    if (q) result = result.filter(r =>
      (r.coin ?? '').toLowerCase().includes(q) ||
      (r.displayName ?? '').toLowerCase().includes(q)
    );
    if (sigFilter !== 'all') result = result.filter(r => getMatrixSignal(r) === sigFilter);
    return result;
  }, [fallbackByTab, fallbackRows, activeTab, search, sigFilter]);

  const sortedFallback = useMemo(() => {
    const col = MATRIX_COLS.find(c => c.key === sortKey);
    const getSV = col?.sortVal ?? ((row: any) => (row as any)[sortKey]);
    const cmp = (a: ScreenerRow, b: ScreenerRow) => {
      const av = getSV(a), bv = getSV(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const d = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? d : -d;
    };
    return [...fallbackFiltered].sort(cmp);
  }, [fallbackFiltered, sortKey, sortDir]);

  const totalCount = useTabbed
    ? (data?.all_assets_count ?? Object.values(tabs).reduce((sum, t) => sum + (t?.count ?? 0), 0))
    : fallbackRows.length;

  // Toggles render regardless of whether the tabbed endpoint succeeded — when
  // it hasn't, we classify rows on the frontend so the user still gets a usable
  // filter on the visible Market Matrix.
  const toggleKeys = MATRIX_TAB_ORDER;
  const toggleLabel = (key: string) =>
    key === 'all' ? 'All' : ((useTabbed ? tabs[key]?.label : undefined) ?? MATRIX_TAB_FALLBACK_LABELS[key] ?? key);
  const toggleCount = (key: string) =>
    key === 'all' ? totalCount : (useTabbed ? (tabs[key]?.count ?? 0) : (fallbackTabCounts[key] ?? 0));
  const activeToggleKey = activeTab === 'all' ? 'all' : (useTabbed ? currentKey : activeTab);

  // Don't render anything only when the entire page has no data at all.
  if (!useTabbed && fallbackRows.length === 0 && !isLoading) return null;

  return (
    <div style={{ margin:'0 0 14px', border:`1px solid ${C.border}`, borderRadius:0, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:C.card2, color:C.text, borderBottom:`1px solid ${C.border}` }}>
        <BarChart2 style={{ width:11, height:11, color:C.teal, flexShrink:0 }} />
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, color:C.teal, textTransform:'uppercase' }}>Market Matrix</span>
        <span style={{ fontSize:8.5, color:C.dim, marginLeft:4 }}>{totalCount} assets</span>
        <div data-testid="market-matrix-toggles" style={{ marginLeft:'auto', display:'flex', flexWrap:'wrap', gap:4, justifyContent:'flex-end' }}>
          {toggleKeys.map(key => {
            const label = toggleLabel(key);
            const count = toggleCount(key);
            const isActive = key === activeToggleKey;
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  padding:'3px 8px', borderRadius:4, cursor:'pointer',
                  fontFamily:C.font, fontSize:9, fontWeight:700, letterSpacing:0.6,
                  textTransform:'uppercase',
                  background: isActive ? `${C.teal}22` : 'transparent',
                  color: isActive ? C.teal : C.dim,
                  border: `1px solid ${isActive ? C.teal : C.border}`,
                }}>
                <span>{label}</span>
                <span style={{
                  fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:8,
                  background: isActive ? `${C.teal}33` : C.dimLow,
                  color: isActive ? C.teal : C.dim,
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      {showMatrix && (
        <>
          {/* ── Signal filter chips ── */}
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:C.card2, borderBottom:`1px solid ${C.dimLow}`, flexWrap:'wrap' }}>
            <span style={{ fontSize:7.5, color:C.dim, letterSpacing:1, textTransform:'uppercase', flexShrink:0 }}>Signal</span>
            {(['all','LONG','SHORT','WATCH','CROWDED','AVOID'] as const).map(sig => {
              const isActive = sigFilter === sig;
              const chipCol  = sig === 'all' ? C.teal : sigColor(sig);
              return (
                <button key={sig} onClick={() => setSigFilter(sig)}
                  style={{ fontSize:8, fontWeight:700, padding:'2px 9px', borderRadius:3, cursor:'pointer',
                    fontFamily:C.font, letterSpacing:0.5, textTransform:'uppercase',
                    background: isActive ? `${chipCol}22` : 'transparent',
                    color: isActive ? chipCol : C.dim,
                    border: `1px solid ${isActive ? chipCol : C.dimLow}`,
                  }}>
                  {sig === 'all' ? 'All Signals' : sig}
                </button>
              );
            })}
          </div>
          {useTabbed ? (
            <>
              {/* ── Tabbed Table ── */}
              <div style={{ overflow:'auto', maxHeight:400 }}>
                {sortedTabbed.length === 0 ? (
                  <div style={{ padding:'24px 14px', textAlign:'center', color:C.dim, fontSize:10 }}>
                    No Hyperliquid markets found in this category yet.
                  </div>
                ) : (
                  <table style={{ borderCollapse:'collapse', width:'max-content', minWidth:'100%' }}>
                    <thead>
                      <tr style={{ background:'#060b14', position:'sticky', top:0, zIndex:10 }}>
                        {MATRIX_COLS.map(col => {
                          const isSorted = sortKey === col.key;
                          return (
                            <th key={col.key} title={col.tooltip} onClick={() => handleSort(col.key)}
                              style={{ width:col.w, minWidth:col.w, padding:'4px 7px', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.dimLow}`, textAlign:col.align??'right', cursor:'pointer', userSelect:'none', background:isSorted?`${C.teal}12`:'transparent', whiteSpace:'nowrap', position:col.key==='coin'?'sticky':'static', left:col.key==='coin'?0:'auto', zIndex:col.key==='coin'?5:'auto' }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:col.align==='left'?'flex-start':'flex-end', gap:2 }}>
                                <span style={{ fontSize:7.5, fontWeight:700, letterSpacing:1, color:isSorted?C.teal:C.dim }}>{col.label}</span>
                                {isSorted ? (sortDir==='asc'?<ChevronUp style={{ width:8,height:8,color:C.teal }} />:<ChevronDown style={{ width:8,height:8,color:C.teal }} />) : <ChevronsUpDown style={{ width:8,height:8,color:C.dimLow }} />}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTabbed.map((row, idx) => {
                        const rowBg = idx % 2 === 0 ? C.bg : C.card2;
                        return (
                          <tr key={`${row.coin ?? idx}_${idx}`} onClick={() => setMatrixChart({ asset: row, tab: currentKey })} style={{ background:rowBg, transition:'background 0.15s', borderBottom:`1px solid ${C.dimLow}`, cursor:'pointer' }}>
                            {MATRIX_COLS.map(col => (
                              <td key={col.key} style={{ padding:'2px 7px', height:22, textAlign:col.align??'right', fontFamily:C.font, fontSize:9, whiteSpace:'nowrap', position:col.key==='coin'?'sticky':'static', left:col.key==='coin'?0:'auto', background:col.key==='coin'?rowBg:'transparent', zIndex:col.key==='coin'?2:'auto', borderRight:`1px solid ${C.dimLow}`, verticalAlign:'middle' }}>
                                {col.render(row)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <>
              {/* ── Fallback Table (untabbed ScreenerRow data, filtered by active tab) ── */}
              <div style={{ overflow:'auto', maxHeight:400 }}>
                {sortedFallback.length === 0 ? (
                  <div style={{ padding:'24px 14px', textAlign:'center', color:C.dim, fontSize:10 }}>
                    {isLoading
                      ? 'Loading Market Matrix…'
                      : `No ${toggleLabel(activeTab)} markets available.`}
                  </div>
                ) : (
                  <table style={{ borderCollapse:'collapse', width:'max-content', minWidth:'100%' }}>
                    <thead>
                      <tr style={{ background:'#060b14', position:'sticky', top:0, zIndex:10 }}>
                        {MATRIX_COLS.map(col => {
                          const isSorted = sortKey === col.key;
                          return (
                            <th key={String(col.key)} title={col.tooltip} onClick={() => handleSort(col.key)}
                              style={{ width:col.w, minWidth:col.w, padding:'4px 7px', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.dimLow}`, textAlign:col.align??'right', cursor:'pointer', userSelect:'none', background:isSorted?`${C.teal}12`:'transparent', whiteSpace:'nowrap', position:col.key==='coin'?'sticky':'static', left:col.key==='coin'?0:'auto', zIndex:col.key==='coin'?5:'auto' }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:col.align==='left'?'flex-start':'flex-end', gap:2 }}>
                                <span style={{ fontSize:7.5, fontWeight:700, letterSpacing:1, color:isSorted?C.teal:C.dim }}>{col.label}</span>
                                {isSorted ? (sortDir==='asc'?<ChevronUp style={{ width:8,height:8,color:C.teal }} />:<ChevronDown style={{ width:8,height:8,color:C.teal }} />) : <ChevronsUpDown style={{ width:8,height:8,color:C.dimLow }} />}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFallback.map((row, idx) => {
                        const rowBg = idx % 2 === 0 ? C.bg : C.card2;
                        return (
                          <tr key={`${row.coin}_${idx}`} onClick={() => setMatrixChart({ asset: { coin: row.coin, display_name: row.displayName, mark: row.markPrice, oracle: row.oraclePrice, change_24h_pct: row.change24hPct, funding: row.funding, open_interest_usd: row.openInterest, volume_24h_usd: row.volume24h, premium_pct: row.premium != null ? row.premium * 100 : null, mark_oracle_pct: row.distMarkOracle != null ? row.distMarkOracle * 100 : null, book_imbalance: row.bidAskImbalance, trade_imbalance: row.tradeImbalance } as MatrixAsset, tab: activeTab })} style={{ background:rowBg, transition:'background 0.15s', borderBottom:`1px solid ${C.dimLow}`, cursor:'pointer' }}>
                            {MATRIX_COLS.map(col => (
                              <td key={String(col.key)} style={{ padding:'2px 7px', height:22, textAlign:col.align??'right', fontFamily:C.font, fontSize:9, whiteSpace:'nowrap', position:col.key==='coin'?'sticky':'static', left:col.key==='coin'?0:'auto', background:col.key==='coin'?rowBg:'transparent', zIndex:col.key==='coin'?2:'auto', borderRight:`1px solid ${C.dimLow}`, verticalAlign:'middle' }}>
                                {col.render(row)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}

      {matrixChart && (
        <MatrixChartModal
          asset={matrixChart.asset}
          activeTab={matrixChart.tab}
          onClose={() => setMatrixChart(null)}
        />
      )}
    </div>
  );
}

// ─── Trade Radar: Setup Explanation Panel ────────────────────────────────────
function SetupExplanationPanel({ card, label, color, onClose }: {
  card: TradeRadarCard; label: string; color: string; onClose: () => void;
}) {
  const dirMap: Record<string, string> = { long:'LONG', short:'SHORT', watch:'WATCH', avoid:'AVOID', neutral:'WATCH' };
  const dirColor: Record<string, string> = { long:C.green, short:C.red, watch:C.amber, avoid:C.red, neutral:C.dim };
  const dir  = (card.direction ?? '').toLowerCase();
  const dCol = dirColor[dir] ?? C.dim;
  const dLbl = dirMap[dir]  ?? (card.direction ?? '—').toUpperCase();
  return (
    <div style={{ background:'#050d1c', border:`1px solid ${color}44`, borderTop:`2px solid ${color}`, borderRadius:6, margin:'0 14px 12px', padding:'12px 16px', position:'relative' }}>
      <button onClick={onClose} style={{ position:'absolute', top:8, right:10, background:'none', border:'none', cursor:'pointer', color:C.dim, lineHeight:1 }}>
        <X style={{ width:12, height:12 }} />
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <span style={{ fontSize:14, fontWeight:800, color, fontFamily:C.font }}>{card.coin ?? '—'}</span>
        <span style={{ fontSize:8, fontWeight:800, color:dCol, background:`${dCol}18`, border:`1px solid ${dCol}44`, borderRadius:3, padding:'1px 6px', letterSpacing:0.5 }}>{dLbl}</span>
        {card.setup_type && card.setup_type === 'TRADE_NOW' && (
          <span style={{ fontSize:8, fontWeight:800, color:C.green, background:`${C.green}18`, border:`1px solid ${C.green}44`, borderRadius:3, padding:'1px 6px', letterSpacing:0.5 }}>TRADE NOW</span>
        )}
        {card.confidence != null && (
          <span style={{ fontSize:8, color:C.dim, marginLeft:'auto' }}>Confidence: <span style={{ color:C.text, fontFamily:C.font }}>{(card.confidence * 100).toFixed(0)}%</span></span>
        )}
        {card.score != null && (
          <span style={{ fontSize:8, color:C.dim }}>Score: <span style={{ color:C.purple, fontFamily:C.font }}>{card.score.toFixed(2)}</span></span>
        )}
      </div>
      {card.thesis && (
        <div style={{ fontSize:10, color:'#c8d8e8', lineHeight:1.65, marginBottom:10, fontStyle:'italic' }}>{card.thesis}</div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'8px 16px' }}>
        {card.bias && (
          <div>
            <div style={{ fontSize:7.5, color:C.teal, letterSpacing:1.2, textTransform:'uppercase', fontWeight:800, marginBottom:3 }}>Bias</div>
            <div style={{ fontSize:9, color:C.text, lineHeight:1.5 }}>{card.bias}</div>
          </div>
        )}
        {card.entry_trigger && (
          <div>
            <div style={{ fontSize:7.5, color:C.teal, letterSpacing:1.2, textTransform:'uppercase', fontWeight:800, marginBottom:3 }}>Entry Trigger</div>
            <div style={{ fontSize:9, color:C.text, lineHeight:1.5 }}>{card.entry_trigger}</div>
          </div>
        )}
        {card.confirmation && (
          <div>
            <div style={{ fontSize:7.5, color:C.amber, letterSpacing:1.2, textTransform:'uppercase', fontWeight:800, marginBottom:3 }}>Confirmation</div>
            <div style={{ fontSize:9, color:C.text, lineHeight:1.5 }}>{card.confirmation}</div>
          </div>
        )}
        {card.invalidation && (
          <div>
            <div style={{ fontSize:7.5, color:C.red, letterSpacing:1.2, textTransform:'uppercase', fontWeight:800, marginBottom:3 }}>Invalidation</div>
            <div style={{ fontSize:9, color:C.text, lineHeight:1.5 }}>{card.invalidation}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Trade Radar: Command Center ─────────────────────────────────────────────
const RADAR_CARDS_META: Array<{
  key: keyof TradeRadarData['trade_radar']['cards'];
  label: string;
  color: string;
}> = [
  { key: 'best_long',     label: 'Best Long',     color: C.green  },
  { key: 'best_short',    label: 'Best Short',    color: C.red    },
  { key: 'squeeze_watch', label: 'Squeeze Watch', color: C.amber  },
  { key: 'pullback_buy',  label: 'Pullback Buy',  color: C.teal   },
  { key: 'crowded_avoid', label: 'Crowded/Avoid', color: '#f97316' },
];

function TradeRadarSection({ data, isLoading, isError, selectedSetup, onSelectSetup }: {
  data: TradeRadarData | null;
  isLoading: boolean;
  isError: boolean;
  selectedSetup: { card: TradeRadarCard; label: string; color: string } | null;
  onSelectSetup: (s: { card: TradeRadarCard; label: string; color: string } | null) => void;
}) {
  const radar  = data?.trade_radar;
  const meta   = data?.meta;
  const regimeRaw = radar?.market_regime ?? null;
  const regime: string | null = typeof regimeRaw === 'string'
    ? regimeRaw
    : regimeRaw != null
      ? (regimeRaw as TradeRadarRegime).regime_label ?? (regimeRaw as TradeRadarRegime).summary ?? null
      : null;
  const regimeObj: TradeRadarRegime | null = (regimeRaw != null && typeof regimeRaw === 'object')
    ? (regimeRaw as TradeRadarRegime)
    : null;

  if (isLoading && !data) {
    return (
      <div style={{ padding:'24px 14px', display:'flex', alignItems:'center', gap:8, color:C.dim, fontSize:10 }}>
        <div style={{ width:14, height:14, border:`2px solid ${C.border}`, borderTopColor:C.teal, borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
        Loading Trade Radar…
      </div>
    );
  }
  if (isError && !data) {
    return (
      <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:7, color:C.amber, fontSize:9.5 }}>
        <AlertTriangle style={{ width:12, height:12 }} />
        Trade Radar unavailable — Market Matrix and TSMOM unaffected.
      </div>
    );
  }
  if (!radar) return null;

  return (
    <div style={{ borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
      {/* ── Regime + Meta strip ── */}
      <div style={{ padding:'6px 14px', background:'#050c17', borderBottom:`1px solid ${C.dimLow}`, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Target style={{ width:10, height:10, color:C.teal }} />
          <span style={{ fontSize:7.5, color:C.dim, letterSpacing:1.5, textTransform:'uppercase' }}>Market Regime</span>
          <span style={{ fontSize:10, fontWeight:700, color:regime?C.text:C.dimLow }}>{regime ?? '—'}</span>
        </div>
        {meta && (
          <div style={{ display:'flex', alignItems:'center', gap:12, marginLeft:'auto' }}>
            <span style={{ fontSize:8, color:C.dimLow }}>{meta.assets_scanned} assets scanned</span>
            <span style={{ fontSize:8, color:C.dimLow }}>{meta.elapsed_ms}ms</span>
            {meta.generated_at && <span style={{ fontSize:8, color:C.dimLow }}>{new Date(meta.generated_at).toLocaleTimeString()}</span>}
          </div>
        )}
      </div>

      {/* ── 5 Radar Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:0, borderBottom:`1px solid ${C.dimLow}` }}>
        {RADAR_CARDS_META.map(({ key, label, color }) => {
          const card = radar.cards?.[key] ?? null;
          const isSelected = selectedSetup?.label === label;
          const dirMap: Record<string,string> = { long:'LONG', short:'SHORT', watch:'WATCH', avoid:'AVOID', neutral:'WATCH' };
          const dirColorMap: Record<string,string> = { long:C.green, short:C.red, watch:C.amber, avoid:C.red, neutral:C.dim };
          const dir   = (card?.direction ?? '').toLowerCase();
          const dCol  = dirColorMap[dir]  ?? C.dim;
          const dLbl  = dirMap[dir]       ?? (card?.direction ?? '—').toUpperCase();
          return (
            <div key={key}
              onClick={() => card ? onSelectSetup(isSelected ? null : { card, label, color }) : undefined}
              style={{
                padding:'10px 12px', borderRight:`1px solid ${C.dimLow}`, cursor:card?'pointer':'default',
                background: isSelected ? `${color}15` : 'transparent',
                borderTop: isSelected ? `2px solid ${color}` : '2px solid transparent',
                transition:'background 0.12s',
              }}
              onMouseEnter={e => { if (card && !isSelected) (e.currentTarget as HTMLElement).style.background=`${color}0a`; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background='transparent'; }}>
              <div style={{ fontSize:7.5, color, letterSpacing:1.5, textTransform:'uppercase', fontWeight:800, marginBottom:4 }}>{label}</div>
              {card ? (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:800, color, fontFamily:C.font }}>{card.coin ?? '—'}</span>
                    <span style={{ fontSize:7.5, fontWeight:700, color:dCol, background:`${dCol}18`, border:`1px solid ${dCol}44`, borderRadius:3, padding:'1px 5px' }}>{dLbl}</span>
                    {card.setup_type === 'TRADE_NOW' && (
                      <span style={{ fontSize:7, fontWeight:800, color:C.green, background:`${C.green}18`, border:`1px solid ${C.green}44`, borderRadius:3, padding:'1px 4px' }}>NOW</span>
                    )}
                  </div>
                  {card.thesis && <div style={{ fontSize:8.5, color:C.dim, lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{card.thesis}</div>}
                  {card.confidence != null && (
                    <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{ flex:1, height:3, background:C.dimLow, borderRadius:2 }}>
                        <div style={{ width:`${(card.confidence*100).toFixed(0)}%`, height:'100%', background:color, borderRadius:2 }} />
                      </div>
                      <span style={{ fontSize:7.5, color:C.dim, fontFamily:C.font }}>{(card.confidence*100).toFixed(0)}%</span>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize:8.5, color:C.dimLow }}>No setup</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Top Setups table ── */}
      {(radar.top_setups?.length ?? 0) > 0 && (
        <div style={{ padding:'8px 14px' }}>
          <div style={{ fontSize:7.5, color:C.dim, letterSpacing:1.5, textTransform:'uppercase', fontWeight:800, marginBottom:6 }}>Top Setups</div>
          <div style={{ display:'grid', gridTemplateColumns:'20px 60px 58px 60px 80px 1fr', gap:0, padding:'3px 8px', background:'#060b14', borderBottom:`1px solid ${C.border}`, borderRadius:'4px 4px 0 0' }}>
            {['#','COIN','DIR','SETUP','CONF','THESIS'].map(h => (
              <span key={h} style={{ fontSize:7.5, color:C.dimLow, fontWeight:700, letterSpacing:1 }}>{h}</span>
            ))}
          </div>
          {radar.top_setups.slice(0, 8).map((s, i) => {
            const dirColorMap: Record<string,string> = { long:C.green, short:C.red, watch:C.amber, avoid:C.red, neutral:C.dim };
            const dir = (s.direction ?? '').toLowerCase();
            const dCol = dirColorMap[dir] ?? C.dim;
            return (
              <div key={i}
                style={{ display:'grid', gridTemplateColumns:'20px 60px 58px 60px 80px 1fr', gap:0, padding:'3px 8px',
                  background:i%2===0?C.bg:C.card2, borderBottom:`1px solid ${C.dimLow}`, alignItems:'center' }}>
                <span style={{ fontSize:7.5, color:C.dimLow }}>{i+1}</span>
                <span style={{ fontSize:9.5, fontWeight:700, color:C.text, fontFamily:C.font }}>{s.coin}</span>
                <span style={{ fontSize:7.5, fontWeight:700, color:dCol }}>{s.direction?.toUpperCase() ?? '—'}</span>
                <span style={{ fontSize:7.5, color:C.dim }}>{s.setup_type ?? '—'}</span>
                <span style={{ fontSize:7.5, color:C.dim, fontFamily:C.font }}>{s.confidence != null ? `${(s.confidence*100).toFixed(0)}%` : '—'}</span>
                <span style={{ fontSize:8, color:C.dim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.thesis ?? '—'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HyperliquidScreenerPage() {
  const [search,        setSearch]        = useState('');
  const [marketType,    setMarketType]    = useState<'all'|'perp'|'spot'>('all');
  const [minVolume,     setMinVolume]     = useState('');
  const [minOI,         setMinOI]         = useState('');
  const [signalFilter,  setSignalFilter]  = useState<'all'|'bullish'|'bearish'>('all');
  const [sortKey,       setSortKey]       = useState<CK>('rank');
  const [sortDir,       setSortDir]       = useState<'asc'|'desc'>('asc');
  const [showAdvanced,  setShowAdvanced]  = useState(false);
  const [liveUpdates,   setLiveUpdates]   = useState(true);
  const [autoRerank,    setAutoRerank]    = useState(false);
  const [density,       setDensity]       = useState<'compact'|'comfortable'>('compact');
  const [selectedCoin,  setSelectedCoin]  = useState<string|null>(null);
  const [pinnedCoins,   setPinnedCoins]   = useState<Set<string>>(new Set());
  const [agentResult,   setAgentResult]   = useState<AgentResult|null>(null);
  const [agentLoading,  setAgentLoading]  = useState(false);
  const [agentError,    setAgentError]    = useState<string|null>(null);
  const [agentStage,    setAgentStage]    = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [rowHighlights, setRowHighlights] = useState<Set<string>>(new Set());
  const [chartModal,    setChartModal]    = useState<{ title: string; coins: string[] } | null>(null);
  const [pageTab,       setPageTab]       = useState<'radar' | 'lab'>('radar');
  const [selectedSetup, setSelectedSetup] = useState<{ card: TradeRadarCard; label: string; color: string } | null>(null);

  const { data: raw, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery<
    { rows: ScreenerRow[]; meta: ScreenerMeta }
  >({
    queryKey: ['hl-screener', marketType],
    queryFn: async () => {
      const r = await fetch(`/api/hyperliquid/screener?market_type=${marketType}&limit=200`);
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      return r.json();
    },
    refetchInterval: liveUpdates ? 15000 : false,  // server cache refreshes every 20s so 15s frontend polling is plenty
    staleTime: 14000,           // treat as fresh until just before next refetch fires
    gcTime: 60 * 60 * 1000,    // keep cache 1 hour so navigating away and back is instant
    retry: 1,
    refetchOnWindowFocus: false, // avoid double-fetch on tab switch
    placeholderData: (previousData: any) => previousData,
  });

  const { data: tradeRadar, isLoading: trRadarLoading, isError: trRadarError } = useQuery<TradeRadarData>({
    queryKey: ['hl-trade-radar'],
    queryFn: async () => {
      const r = await fetch('/api/hyperliquid/screener/trade-radar');
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  // Permanent last-good-data ref — NEVER cleared, so the screen never goes
  // blank during refetches, backend restarts, or transient error states.
  // Seeded from localStorage on first mount so page reloads are instant too.
  const _lastGood = useRef<{ rows: ScreenerRow[]; meta: ScreenerMeta } | null>(null);
  if (_lastGood.current === null) {
    try {
      const cached = localStorage.getItem('hl_screener_cache');
      if (cached) _lastGood.current = JSON.parse(cached);
    } catch { /* ignore parse errors */ }
  }
  // Only persist non-empty snapshots so an empty-row response never
  // overwrites good cached data (server returns rows:[] during cache warm-up).
  if (raw != null && raw.rows.length > 0) {
    _lastGood.current = raw;
    try { localStorage.setItem('hl_screener_cache', JSON.stringify(raw)); } catch { /* ignore quota errors */ }
  }
  // Prefer the live snapshot only when it has rows; fall back to last-good
  // so the screen never goes blank during background refreshes.
  const displayData = (raw?.rows?.length ?? 0) > 0 ? raw : (_lastGood.current ?? raw);

  // Merge agent results into rows for matrix colouring
  const rows: ScreenerRow[] = useMemo(() => {
    const base = displayData?.rows ?? [];
    if (!agentResult) return base;
    const am = new Map(agentResult.rankedCoins.map(a=>[a.coin,a]));
    return base.map(row => { const ag=am.get(row.coin); if(!ag) return row; return {...row, agentRank:ag.agentRank, agentScore:ag.agentScore, agentRationale:ag.rationale, rankDelta:row.rank-ag.agentRank}; });
  }, [displayData, agentResult]);

  // ── Page context for chatbot ──────────────────────────────────────────────
  useSetPageContext((() => {
    const parts = ['[Page: Hyperliquid Screener — Perp & Spot DEX Intelligence]'];
    parts.push(`Filter: ${marketType === 'all' ? 'All markets' : marketType === 'perp' ? 'Perpetuals only' : 'Spot only'} · ${rows.length} rows loaded`);
    if (rows.length) {
      const bullish = rows.filter(r=>r.signalDirection==='bullish').slice(0,8).map(r=>r.coin);
      const bearish = rows.filter(r=>r.signalDirection==='bearish').slice(0,6).map(r=>r.coin);
      const topBySignal = [...rows].filter(r=>r.compositeSignal!=null).sort((a,b)=>(b.compositeSignal??0)-(a.compositeSignal??0)).slice(0,10).map(r=>r.coin);
      if (topBySignal.length) parts.push(`Top by composite signal: ${topBySignal.join(', ')}`);
      if (bullish.length) parts.push(`Bullish signals: ${bullish.join(', ')}`);
      if (bearish.length) parts.push(`Bearish signals: ${bearish.join(', ')}`);
    }
    parts.push('Use for Hyperliquid perp analysis, funding rates, OI changes, breakout detection, and DEX-specific signals.');
    return parts.join('\n');
  })(), [rows, marketType]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) { const q=search.trim().toLowerCase(); r=r.filter(row=>row.coin.toLowerCase().includes(q)||(row.displayName??'').toLowerCase().includes(q)); }
    // Only filter by marketType if the row actually has the field set (backend may omit it)
    if (marketType !== 'all') r = r.filter(row => !row.marketType || row.marketType === marketType);
    if (minVolume) r = r.filter(row => (row.volume24h??0) >= parseFloat(minVolume)*1e6);
    if (minOI)     r = r.filter(row => (row.openInterest??0) >= parseFloat(minOI)*1e6);
    if (signalFilter !== 'all') r = r.filter(row => row.signalDirection === signalFilter);
    return r;
  }, [rows, search, marketType, minVolume, minOI, signalFilter]);

  const sorted = useMemo(() => {
    const pinned = filtered.filter(r => pinnedCoins.has(r.coin));
    const rest   = filtered.filter(r => !pinnedCoins.has(r.coin));
    const cmp = (a: ScreenerRow, b: ScreenerRow) => {
      const av=a[sortKey] as any, bv=b[sortKey] as any;
      if(av==null&&bv==null)return 0; if(av==null)return 1; if(bv==null)return -1;
      const d=av<bv?-1:av>bv?1:0; return sortDir==='asc'?d:-d;
    };
    return [...pinned, ...rest.sort(cmp)];
  }, [filtered, sortKey, sortDir, pinnedCoins]);

  useSetScreenContext({
    route: '/app/hyperliquid-screener',
    page: 'hyperliquid',
    tab: marketType,
    filters: {
      search: search || null,
      signal: signalFilter,
      minVolume: minVolume || null,
      minOI: minOI || null,
    },
    sort: { key: sortKey, dir: sortDir },
    row_count: sorted.length,
    visible_rows: sorted.slice(0, 25).map(r => ({
      coin: r.coin,
      price: r.markPrice ?? null,
      change24h: r.change24hPct ?? null,
      funding: r.funding ?? null,
      signal: r.signalDirection ?? null,
      composite: r.compositeSignal ?? null,
      oi: r.openInterest ?? null,
      vol24h: r.volume24h ?? null,
    })),
    selected: selectedCoin,
    freshness: displayData?.meta?.lastUpdated ?? undefined,
  }, [sorted, marketType, search, signalFilter, sortKey, sortDir, selectedCoin]);

  const signalSections = useMemo(() => deriveSignalSections(sorted), [sorted]);

  const summaryItems = useMemo(() => {
    const meta = displayData?.meta;
    if (!rows.length && !meta) return [];
    const top  = (key: keyof ScreenerRow, asc=false) => [...rows].filter(r=>r[key]!=null).sort((a,b)=>asc?(a[key] as number)-(b[key] as number):(b[key] as number)-(a[key] as number))[0];
    const topA = (key: keyof ScreenerRow) => [...rows].filter(r=>r[key]!=null).sort((a,b)=>Math.abs(b[key] as number)-Math.abs(a[key] as number))[0];
    const g=top('change24hPct'), l=top('change24hPct',true), fh=top('funding'), fl=top('funding',true), d=topA('distMarkOracle'), v=top('volume24h'), topOI=top('openInterest');
    return [
      { id:'g',  label:'Top Gainer',   coin:g?.coin,  value:g?pctD(g.change24hPct):'—',   color:C.green  },
      { id:'l',  label:'Top Loser',    coin:l?.coin,  value:l?pctD(l.change24hPct):'—',   color:C.red    },
      { id:'fh', label:'High Funding', coin:fh?.coin, value:fh?fmtF(fh.funding):'—',      color:C.green  },
      { id:'fl', label:'Neg Funding',  coin:fl?.coin, value:fl?fmtF(fl.funding):'—',      color:C.blue   },
      { id:'d',  label:'Mk/Oracle Δ',  coin:d?.coin,  value:d?fmtD(d.distMarkOracle):'—', color:C.amber  },
      { id:'v',  label:'Vol Leader',   coin:v?.coin,  value:v?$$(v.volume24h):'—',         color:C.teal   },
      { id:'oi', label:'OI Leader',   coin:topOI?.coin, value:topOI?$$(topOI.openInterest):'—', color:C.purple },
      { id:'ag', label:'Agent Top',    coin:agentResult?.longs[0]?.coin, value:agentResult?.longs[0]?agentResult.longs[0].agentScore.toFixed(2):'—', color:C.purple },
      { id:'ts', label:'Updated',      coin:null, value:displayData?.meta?.lastUpdated?new Date(displayData.meta.lastUpdated).toLocaleTimeString():dataUpdatedAt?new Date(dataUpdatedAt).toLocaleTimeString():'—', color:C.dim },
    ];
  }, [displayData, rows, agentResult, dataUpdatedAt]);

  const handleSort = useCallback((key: CK) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  // ── Agent run: triggered ONLY by the top-right header button ──
  const runAgent = useCallback(async () => {
    setAgentLoading(true); setAgentError(null); setAgentStage('Sending to agent…');
    try {
      const payload = { rows: sorted.slice(0,100).map(r => ({
        coin:r.coin, markPrice:r.markPrice, change24hPct:r.change24hPct, funding:r.funding,
        premium:r.premium, openInterest:r.openInterest, oiChangePct:r.oiChangePct,
        volume24h:r.volume24h, volumeImpulse:r.volumeImpulse, compositeSignal:r.compositeSignal,
        signalDirection:r.signalDirection, signalConfidence:r.signalConfidence, momentum:r.momentum,
        breakoutScore:r.breakoutScore, meanReversionScore:r.meanReversionScore, liquidityScore:r.liquidityScore,
        flowScore:r.flowScore, volatility:r.volatility, bidAskImbalance:r.bidAskImbalance,
        tradeImbalance:r.tradeImbalance, distMarkOracle:r.distMarkOracle,
      })) };
      setAgentStage('Agent analyzing…');
      const res = await fetch('/api/hyperliquid/agent-rank', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (res.status === 503) {
        setAgentError('Market data still loading. Please wait a moment and try again.');
        return;
      }
      if (!res.ok) throw new Error(`Agent returned ${res.status}`);
      const data: AgentResult = await res.json();
      setAgentResult(data);
      const highlights = new Set(data.rankedCoins.filter(r=>Math.abs(r.agentRank-(rows.find(x=>x.coin===r.coin)?.rank??r.agentRank))>=3).map(r=>r.coin));
      setRowHighlights(highlights);
      setTimeout(() => setRowHighlights(new Set()), 4000);
      if (autoRerank) setSortKey('agentRank');
    } catch(e:any) { setAgentError(e.message??'Agent failed'); }
    finally { setAgentLoading(false); setAgentStage(''); }
  }, [sorted, rows, autoRerank]);

  const togglePin = useCallback((coin:string, e:React.MouseEvent) => {
    e.stopPropagation();
    setPinnedCoins(prev => { const s=new Set(prev); s.has(coin)?s.delete(coin):s.add(coin); return s; });
  }, []);

  const rowH = density === 'compact' ? 26 : 34;

  const Btn = ({ onClick, active, children, color }: { onClick:()=>void; active?:boolean; children:React.ReactNode; color?:string }) => (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:4, border:`1px solid ${active?(color??C.teal):C.border}`, background:active?`${color??C.teal}22`:C.card, color:active?(color??C.teal):C.dim, fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', letterSpacing:0.5, transition:'all 0.12s' }}>
      {children}
    </button>
  );

  return (
    <div style={{ background:C.bg, color:C.text, fontFamily:C.font, fontSize:11, height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <div style={{ background:'#060b14', borderBottom:`1px solid ${C.border}`, padding:'0 12px', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'nowrap', overflowX:'auto', scrollbarWidth:'none', minHeight:44 }}>
        {/* Logo + title */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ width:26, height:26, borderRadius:5, background:`linear-gradient(135deg,${C.teal},#0369a1)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Activity style={{ width:14, height:14, color:'#fff' }} />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:800, letterSpacing:1.5, color:C.text }}>HL SCREENER</div>
            <div style={{ fontSize:7, color:C.dim, letterSpacing:2 }}>HYPERLIQUID MARKETS</div>
          </div>
        </div>
        <div style={{ width:1, height:22, background:C.border, flexShrink:0, margin:'0 4px' }} />
        {/* Search */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <Search style={{ position:'absolute', left:7, top:'50%', transform:'translateY(-50%)', width:11, height:11, color:C.dim }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search coin…"
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 8px 4px 22px', fontSize:10, color:C.text, width:130, outline:'none' }} />
          {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:5, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.dim }}><X style={{ width:10, height:10 }} /></button>}
        </div>
        <div style={{ width:1, height:22, background:C.border, flexShrink:0, margin:'0 4px' }} />
        {/* Summary chips — inline in toolbar, "Updated" chip excluded (shown in right rail) */}
        {(isLoading && !displayData)
          ? Array.from({length:8}).map((_,i) => <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:'5px 11px', flexShrink:0, minWidth:86, height:34, opacity:0.25 }} />)
          : summaryItems.filter(item => item.id !== 'ts').map(item => (
              <SummaryChip key={item.id} label={item.label} coin={item.coin} value={item.value} color={item.color}
                selected={!!item.coin && selectedCoin===item.coin}
                onClick={item.coin ? () => setSelectedCoin(item.coin!) : undefined} />
            ))
        }
        {/* Right-side controls */}
        <div style={{ flex:1 }} />
        <Btn onClick={() => refetch()}>
          <RefreshCw style={{ width:10, height:10, ...(isFetching?{animation:'spin 1s linear infinite'}:{}) }} /> Refresh
        </Btn>
        {dataUpdatedAt > 0 && (
          <span style={{ fontSize:9, color:C.dim, flexShrink:0 }}>
            Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
        {/* ── THE ONLY AGENT TRIGGER ── */}
        <button onClick={runAgent} disabled={agentLoading} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:4, background:agentLoading?`${C.purple}33`:`linear-gradient(135deg,${C.purple},#7c3aed)`, border:`1px solid ${C.purple}`, color:'#fff', fontSize:10, fontWeight:700, cursor:agentLoading?'not-allowed':'pointer', letterSpacing:0.5, flexShrink:0, transition:'all 0.15s' }}>
          <Bot style={{ width:12, height:12 }} />{agentLoading?(agentStage||'Running…'):'Agent'}
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:isError?C.red:isFetching?C.amber:C.green, boxShadow:`0 0 5px ${isError?C.red:isFetching?C.amber:C.green}` }} />
          <span style={{ fontSize:9, color:C.dim }}>{isError?'ERROR':isFetching?'LIVE':'LIVE'}</span>
        </div>
      </div>

      {/* ── TAB BAR ──────────────────────────────────────────────────── */}
      <div style={{ background:'#060b14', borderBottom:`1px solid ${C.border}`, padding:'0 14px', display:'flex', alignItems:'center', gap:0, flexShrink:0 }}>
        {([
          { id:'radar', label:'Trade Radar',  icon:<Activity style={{ width:10, height:10 }} /> },
          { id:'lab',   label:'Signal Lab',   icon:<BarChart2 style={{ width:10, height:10 }} /> },
        ] as const).map(tab => {
          const active = pageTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setPageTab(tab.id)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 16px', background:'none', border:'none',
                borderBottom: active ? `2px solid ${C.teal}` : '2px solid transparent',
                color: active ? C.teal : C.dim, fontSize:10.5, fontWeight:700, cursor:'pointer',
                letterSpacing:0.5, transition:'color 0.12s', textTransform:'uppercase', marginBottom:'-1px' }}>
              {tab.icon}{tab.label}
            </button>
          );
        })}
      </div>

      {/* ── SCROLLABLE BODY ───────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>

        {/* Initial load spinner — only shown when there is truly no data yet */}
        {isLoading && !displayData && (
          <div style={{ padding:40, textAlign:'center', color:C.dim, fontSize:11 }}>
            <div style={{ width:22, height:22, border:`2px solid ${C.border}`, borderTopColor:C.teal, borderRadius:'50%', animation:'spin 0.9s linear infinite', margin:'0 auto 10px' }} />
            Loading Hyperliquid signal snapshot…
          </div>
        )}
        {/* Error only shown when there is no cached data to fall back on */}
        {isError && !displayData && (
          <div style={{ padding:32, textAlign:'center' }}>
            <AlertTriangle style={{ width:22, height:22, color:C.amber, marginBottom:8 }} />
            <div style={{ fontSize:11, color:C.amber, marginBottom:5 }}>Failed to load screener data</div>
            <div style={{ fontSize:9.5, color:C.dim, marginBottom:10 }}>{(error as any)?.message}</div>
            <button onClick={() => refetch()} style={{ background:C.teal, color:'#fff', border:'none', borderRadius:4, padding:'5px 14px', fontSize:10, cursor:'pointer' }}>Retry</button>
          </div>
        )}
        {/* Subtle refresh indicator — only shown when data is on screen and a background fetch is running */}
        {isFetching && displayData && (
          <div style={{ position:'sticky', top:0, zIndex:20, background:`${C.teal}18`, borderBottom:`1px solid ${C.teal}33`, padding:'3px 14px', fontSize:8.5, color:C.teal, display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', border:`1.5px solid ${C.teal}`, borderTopColor:'transparent', animation:'spin 0.7s linear infinite', flexShrink:0 }} />
            Refreshing data…
          </div>
        )}

        {displayData && pageTab === 'radar' && (
          <>
            {/* ── TRADE RADAR COMMAND CENTER ── */}
            <TradeRadarSection
              data={tradeRadar ?? null}
              isLoading={trRadarLoading}
              isError={trRadarError}
              selectedSetup={selectedSetup}
              onSelectSetup={s => setSelectedSetup(s)}
            />

            {/* ── SETUP EXPLANATION PANEL ── */}
            {selectedSetup && (
              <SetupExplanationPanel
                card={selectedSetup.card}
                label={selectedSetup.label}
                color={selectedSetup.color}
                onClose={() => setSelectedSetup(null)}
              />
            )}

            {/* ── MARKET MATRIX ── */}
            <MarketMatrixSection search={search} fallbackRows={sorted} />

            {/* ── TSMOM MOMENTUM PANEL ── */}
            {sorted.length > 0 && (
              <SectionErrorBoundary label="Time-Series Momentum">
                <MomentumPanel selectedCoin={selectedCoin} onSelect={setSelectedCoin}
                  onChartOpen={(title, coins) => setChartModal({ title, coins })} />
              </SectionErrorBoundary>
            )}
          </>
        )}

        {displayData && pageTab === 'lab' && (
          <>
            {/* ── HERO: SIGNAL BRIEF (Agent Market Brief — existing widget) ── */}
            <AgentMarketBrief
              agentResult={agentResult} agentLoading={agentLoading} agentStage={agentStage}
              rows={sorted} selectedCoin={selectedCoin} onSelect={setSelectedCoin}
              middleSlot={null} />

            {/* ── ADVANCED SIGNAL CARDS (RS, Order Book, OI Regime) ── */}
            {sorted.length > 0 && (
              <SectionErrorBoundary label="Advanced Signals">
                <AdvancedSignalCards selectedCoin={selectedCoin} onSelect={setSelectedCoin}
                  onChartOpen={(title, coins) => setChartModal({ title, coins })} />
              </SectionErrorBoundary>
            )}

            {/* ── SIGNAL BOARDS ── */}
            {sorted.length > 0 && (
              <div style={{ padding:'12px 14px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:10 }}>
                {signalSections.map(sec => (
                  <SignalBoard key={sec.id} section={sec} selectedCoin={selectedCoin}
                    onSelect={setSelectedCoin}
                    onChartOpen={(title, coins) => setChartModal({ title, coins })} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── AGENT ERROR ───────────────────────────────────────────────── */}
      {agentError && (
        <div style={{ background:`${C.red}18`, borderTop:`1px solid ${C.red}44`, padding:'5px 14px', display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
          <AlertTriangle style={{ width:12, height:12, color:C.red }} />
          <span style={{ fontSize:9.5, color:C.red }}>Agent error: {agentError}</span>
          <button onClick={() => setAgentError(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.red }}><X style={{ width:12, height:12 }} /></button>
        </div>
      )}

      {/* ── CHART LIST MODAL ──────────────────────────────────────────────── */}
      {chartModal && (
        <ChartListModal
          title={chartModal.title}
          coins={chartModal.coins}
          onClose={() => setChartModal(null)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
        ::-webkit-scrollbar-thumb:hover { background:#253555; }
      `}</style>
    </div>
  );
}
