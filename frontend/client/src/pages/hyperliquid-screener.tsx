import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Search, RefreshCw, Bot, X, ChevronDown, ChevronUp,
  ChevronsUpDown, AlertTriangle, Pin, BarChart2,
  TrendingUp, TrendingDown, Eye, ShieldAlert, Zap,
} from 'lucide-react';

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
      {/* Thesis header */}
      <div style={{ padding:'8px 12px 6px', borderBottom:`1px solid ${C.border}`, background:C.card2, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
          <span style={{ fontFamily:C.font, fontWeight:800, fontSize:15, color:C.text }}>{coin}</span>
          <span style={{ fontSize:8.5, fontWeight:700, color:dir.color, background:`${dir.color}18`, border:`1px solid ${dir.color}44`, borderRadius:3, padding:'2px 6px' }}>{dir.label}</span>
          {setupType && <span style={{ fontSize:8, color:setup.color, background:`${setup.color}12`, border:`1px solid ${setup.color}33`, borderRadius:3, padding:'1px 5px' }}>{setup.label}</span>}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            {rankMov != null && rankMov !== 0 && (
              <span style={{ fontSize:8, fontWeight:700, color:rankMov>0?C.green:C.red }}>{rankMov>0?`▲${rankMov}`:`▼${Math.abs(rankMov)}`} rank</span>
            )}
            <span style={{ fontSize:10, fontWeight:800, color:C.purple, fontFamily:C.font }}>Score {score.toFixed(2)}</span>
            <span style={{ fontSize:9, color:scC(confidence) }}>Conf {(confidence*100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'0 12px 10px' }}>
        {/* Key metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px', marginTop:6 }}>
          {row ? <>
            <Metric label="Mark"        value={px(row.markPrice)} />
            <Metric label="24H Chg"     value={pctD(row.change24hPct)} vc={pctC(row.change24hPct)} />
            <Metric label="Funding/hr"  value={fmtF(row.funding)} vc={fC(row.funding)} />
            <Metric label="OI"          value={$$(row.openInterest)} />
            <Metric label="Volume"      value={$$(row.volume24h)} />
            <Metric label="Oracle"      value={px(row.oraclePrice)} />
            <Metric label="Mk/Oracle Δ" value={fmtD(row.distMarkOracle)} vc={pctC(row.distMarkOracle)} />
            <Metric label="Premium"     value={fmtD(row.premium)} vc={pctC(row.premium)} />
            <Metric label="Trade Flow"  value={row.tradeImbalance==null?'—':row.tradeImbalance.toFixed(3)} vc={pctC(row.tradeImbalance)} />
            <Metric label="Book Imbal"  value={row.bidAskImbalance==null?'—':row.bidAskImbalance.toFixed(3)} vc={pctC(row.bidAskImbalance)} />
            <Metric label="Vol Regime"  value={sc(row.volatility)} vc={scC(row.volatility)} />
            <Metric label="Composite"   value={sc(row.compositeSignal)} vc={scC(row.compositeSignal)} />
          </> : briefMetrics ? Object.entries(briefMetrics).slice(0,10).map(([k,v]) => (
            <Metric key={k} label={k.replace(/_/g,' ')} value={v==null?'—':v.toFixed(4)} />
          )) : null}
        </div>

        {/* Thesis summary */}
        {thesisText && (
          <Section title="Thesis" color={C.purple}>
            <div style={{ fontSize:9, color:C.text, lineHeight:1.65, background:`${C.purple}0c`, border:`1px solid ${C.purple}33`, borderRadius:4, padding:'7px 9px' }}>
              {thesisText}
            </div>
          </Section>
        )}

        {/* Reasons */}
        {reasons.length > 0 && (
          <Section title="Why Now" color={C.green}>
            <Bullets items={reasons} color={C.green} />
          </Section>
        )}

        {/* What to watch */}
        {whatToWatch.length > 0 && (
          <Section title="What to Watch" color={C.teal}>
            <Bullets items={whatToWatch} color={C.teal} />
          </Section>
        )}

        {/* Signal driver bars (legacy items) */}
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

        {/* Invalidation */}
        {invalidation.length > 0 && (
          <Section title="Invalidation / Risk" color={C.amber}>
            <div style={{ background:`${C.amber}0c`, border:`1px solid ${C.amber}44`, borderRadius:4, padding:'7px 9px' }}>
              <Bullets items={invalidation} color={C.amber} />
            </div>
          </Section>
        )}

        {row && (
          <div style={{ fontSize:7, color:C.dimLow, marginTop:10, display:'flex', gap:10, flexWrap:'wrap' }}>
            {row.maxLeverage!=null&&<span>Max lev {row.maxLeverage}×</span>}
            {row.oiChangePct!=null&&<span>OI Δ <span style={{ color:pctC(row.oiChangePct) }}>{pctD(row.oiChangePct)}</span></span>}
            {row.updatedAt&&<span>Updated {new Date(row.updatedAt).toLocaleTimeString()}</span>}
          </div>
        )}
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
function AgentMarketBrief({ agentResult, agentLoading, agentStage, rows, selectedCoin, onSelect }: {
  agentResult: AgentResult | null; agentLoading: boolean; agentStage: string;
  rows: ScreenerRow[]; selectedCoin: string | null; onSelect: (coin: string) => void;
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
    // Fallback: derive from rows
    const bullish = rows.filter(r => r.signalDirection==='bullish').sort((a,b) => (b.compositeSignal??0)-(a.compositeSignal??0));
    const bearish = rows.filter(r => r.signalDirection==='bearish').sort((a,b) => (a.compositeSignal??1)-(b.compositeSignal??1));
    const brk     = [...rows].filter(r=>r.breakoutScore!=null).sort((a,b)=>(b.breakoutScore??0)-(a.breakoutScore??0));
    const exh     = rows.filter(r => (r.funding??0)>0.015).sort((a,b)=>(b.funding??0)-(a.funding??0));
    const pctBull = rows.length ? ((bullish.length/rows.length)*100).toFixed(0) : '—';
    return {
      bestLong:    bullish[0]  ? { coin:bullish[0].coin,  side:'long'  as const, score:bullish[0].compositeSignal??0,  thesisSummary:`Composite ${sc(bullish[0].compositeSignal)}` } : null,
      bestShort:   bearish[0]  ? { coin:bearish[0].coin,  side:'short' as const, score:bearish[0].compositeSignal??0,  thesisSummary:`Composite ${sc(bearish[0].compositeSignal)}` } : null,
      bestBreakout:brk[0]      ? { coin:brk[0].coin,      side:'watch' as const, score:brk[0].breakoutScore??0,        thesisSummary:`Breakout score ${sc(brk[0].breakoutScore)}` } : null,
      bestExhaust: exh[0]      ? { coin:exh[0].coin,      side:'watch' as const, score:exh[0].funding??0,              thesisSummary:`High funding ${fmtF(exh[0].funding)}` } : null,
      regime: rows.length ? `${pctBull}% bullish · ${rows.length} perps scanned` : null,
    };
  }, [briefing, rows]);

  // Derive ranked ideas
  const ideas: BriefingIdea[] = useMemo(() => {
    if (briefing?.actionableIdeas.length) return briefing.actionableIdeas.slice(0,6);
    if (agentResult) {
      return agentResult.rankedCoins.slice(0,6).map(a => ({
        coin:a.coin, side:a.direction as any, setupType:a.setupType, score:a.agentScore,
        confidence:a.confidence, thesisTitle:null, thesisSummary:a.thesis??a.rationale,
        reasons:null, whatToWatch:null, invalidationNotes:a.riskNote?[a.riskNote]:null,
        rankMovement:a.rankMovement, metrics:null,
      }));
    }
    return rows.filter(r=>r.compositeSignal!=null).sort((a,b)=>(b.compositeSignal!-a.compositeSignal!)).slice(0,6).map((r,i)=>({
      coin:r.coin, side:(r.signalDirection==='bullish'?'long':r.signalDirection==='bearish'?'short':'watch') as any,
      setupType:null, score:r.compositeSignal!, confidence:r.signalConfidence??0.5,
      thesisTitle:null, thesisSummary:r.agentRationale??null, reasons:null, whatToWatch:null,
      invalidationNotes:null, rankMovement:null, metrics:null,
    }));
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

      {/* ── Title bar ── */}
      <div style={{ padding:'9px 16px 7px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${C.dimLow}` }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:agentLoading?C.amber:agentResult?C.purple:C.dimLow, boxShadow:agentResult?`0 0 8px ${C.purple}`:'none', transition:'all 0.3s', flexShrink:0 }} />
        <div>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:agentResult?C.purple:C.dim, textTransform:'uppercase' }}>Agent Market Brief</div>
          <div style={{ fontSize:8.5, color:C.dim }}>
            {agentLoading
              ? agentStage
              : agentResult
              ? `Live interpretation · ${new Date(agentResult.generatedAt).toLocaleTimeString()}`
              : 'Live interpretation of the strongest Hyperliquid setups — press Agent above to refresh'}
          </div>
        </div>
        {agentLoading && (
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:13, height:13, border:`2px solid ${C.border}`, borderTopColor:C.purple, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <span style={{ fontSize:9, color:C.purple }}>{agentStage}</span>
          </div>
        )}
        {agentResult && !agentLoading && (
          <div style={{ marginLeft:'auto', display:'flex', gap:7, alignItems:'center' }}>
            {agentResult.longs.slice(0,2).map(a => (
              <span key={a.coin} style={{ fontSize:8.5, fontWeight:700, color:C.green, background:`${C.green}11`, border:`1px solid ${C.green}33`, borderRadius:3, padding:'2px 7px', fontFamily:C.font }}>▲ {a.coin}</span>
            ))}
            {agentResult.shorts.slice(0,2).map(a => (
              <span key={a.coin} style={{ fontSize:8.5, fontWeight:700, color:C.red, background:`${C.red}11`, border:`1px solid ${C.red}33`, borderRadius:3, padding:'2px 7px', fontFamily:C.font }}>▼ {a.coin}</span>
            ))}
          </div>
        )}
      </div>

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
        <QuickLookTile label="Breakout Watch"    coin={ql.bestBreakout?.coin??null}sub={ql.bestBreakout?.thesisSummary??'No signal yet'} color={C.teal} preview={isPreview} />
        <QuickLookTile label="Exhaustion Watch"  coin={ql.bestExhaust?.coin??null} sub={ql.bestExhaust?.thesisSummary??'No signal yet'} color={C.amber} preview={isPreview} />
        <div style={{ flex:1, padding:'8px 12px', display:'flex', flexDirection:'column', gap:3 }}>
          <span style={{ fontSize:7.5, color:C.dim, letterSpacing:1.5, textTransform:'uppercase' }}>Market Regime</span>
          <span style={{ fontSize:11, fontWeight:700, color:ql.regime?C.text:C.dimLow, lineHeight:1.2 }}>{ql.regime ?? '—'}</span>
        </div>
      </div>

      {/* ── B: Ranked ideas + C: Thesis ── */}
      <div style={{ display:'flex', height:232 }}>
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
            : ideas.map((idea, i) => (
                <IdeaRow key={idea.coin} rank={i+1} coin={idea.coin} side={idea.side} setupType={idea.setupType}
                  score={idea.score} confidence={idea.confidence} thesisSummary={idea.thesisSummary}
                  rankMovement={idea.rankMovement} selected={effIdx===i}
                  onClick={() => { setSelectedIdx(i); onSelect(idea.coin); }} />
              ))
          }
          {isPreview && ideas.length > 0 && (
            <div style={{ padding:'5px 12px', fontSize:8, color:C.dimLow, textAlign:'center', borderTop:`1px solid ${C.dimLow}`, marginTop:'auto', flexShrink:0 }}>
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
function SignalBoard({ section, selectedCoin, onSelect }: {
  section: DerivedSection; selectedCoin: string|null; onSelect: (coin: string) => void;
}) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, borderTop:`2px solid ${section.color}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'6px 10px 4px', borderBottom:`1px solid ${C.dimLow}`, flexShrink:0 }}>
        <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:1.5, color:section.color, textTransform:'uppercase' }}>{section.title}</div>
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
interface Col { key: CK; label: string; w: number; fmt: (v:any)=>string; vc?: (v:any)=>string; align?: 'left'|'right' }
const MAT_COLS: Col[] = [
  { key:'coin',            label:'COIN',    w:90,  fmt: v=>v??'—',                            align:'left' },
  { key:'markPrice',       label:'MARK',    w:100, fmt: px },
  { key:'change24hPct',    label:'24H%',    w:72,  fmt: pctD,  vc: pctC },
  { key:'funding',         label:'FUND%',   w:80,  fmt: fmtF,  vc: fC },
  { key:'openInterest',    label:'OI',      w:90,  fmt: $$ },
  { key:'volume24h',       label:'VOL',     w:90,  fmt: $$ },
  { key:'premium',         label:'PREM%',   w:80,  fmt: fmtD,  vc: pctC },
  { key:'distMarkOracle',  label:'MK-ORC%', w:80,  fmt: fmtD,  vc: pctC },
  { key:'bidAskImbalance', label:'BK-IMB',  w:72,  fmt: v=>v==null?'—':v.toFixed(3), vc: pctC },
  { key:'tradeImbalance',  label:'TR-IMB',  w:72,  fmt: v=>v==null?'—':v.toFixed(3), vc: pctC },
  { key:'volatility',      label:'VOL-S',   w:68,  fmt: sc,    vc: scC },
  { key:'compositeSignal', label:'SIG',     w:68,  fmt: sc,    vc: scC },
  { key:'agentScore',      label:'A-SCR',   w:68,  fmt: sc,    vc: scC },
  { key:'agentRank',       label:'A-RNK',   w:60,  fmt: v=>v??'—' },
];


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

// ─── Momentum Panel (TSMOM) ───────────────────────────────────────────────────
function MomentumPanel({ selectedCoin, onSelect }: {
  selectedCoin: string | null;
  onSelect: (coin: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, isError } = useQuery<TsmomResult>({
    queryKey: ['tsmom-signals'],
    queryFn: async () => {
      const r = await fetch('/api/hyperliquid/tsmom-signals?top_n=60');
      if (!r.ok) throw new Error(`TSMOM ${r.status}`);
      return r.json();
    },
    // Poll every 15s so signals appear quickly after boot; back off once data arrives
    refetchInterval: (query: any) => {
      const d = query?.state?.data as TsmomResult | undefined;
      return !d || d.signals.length === 0 ? 15_000 : 60_000;
    },
    staleTime: 10_000,
    retry: 2,
    retryDelay: 5000,
  });

  const signals = data?.signals ?? [];
  const meta    = data?.meta;
  const display = showAll ? signals : signals.slice(0, 20);

  // Signal bar: -2 to +2 mapped to 0%..100%
  const sigBar = (s: number) => ((s + 2) / 4) * 100;

  return (
    <div style={{ margin: '0 14px 14px', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
          background: C.card2, border: 'none', cursor: 'pointer', color: C.text,
          borderBottom: open ? `1px solid ${C.border}` : 'none' }}>
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
        {isError  && <span style={{ fontSize: 8, color: C.red,   marginLeft: 6 }}>No data yet — loading 1d candles</span>}
        <span style={{ marginLeft: 'auto', color: C.dim }}>
          {open ? <ChevronUp style={{ width: 11, height: 11 }} /> : <ChevronDown style={{ width: 11, height: 11 }} />}
        </span>
      </button>

      {open && (
        <div>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '24px 72px 140px 80px 60px 60px 60px 60px 60px',
            padding: '4px 12px', background: '#060b14', borderBottom: `1px solid ${C.border}`,
            gap: 0 }}>
            {['#','COIN','SIGNAL','SIDE','VOL%','10D%','30D%','FUND','W%'].map((h, i) => (
              <span key={i} style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: C.dim,
                textAlign: i >= 4 ? 'right' : i === 2 ? 'center' : 'left',
                paddingRight: i >= 4 ? 8 : 0 }}>{h}</span>
            ))}
          </div>

          {/* Signal rows */}
          {display.length === 0 && !isLoading && (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 9, color: C.dim }}>
              {isError
                ? 'Error loading TSMOM signals — retrying in 8s…'
                : 'Computing momentum signals — 1d candle data loading in background. Auto-refreshes every 60s.'}
            </div>
          )}
          {display.map((sig, i) => {
            const isSel  = selectedCoin === sig.coin;
            const sColor = sig.s_adj > 0.15 ? C.green : sig.s_adj < -0.15 ? C.red : C.dim;
            const barPct = sigBar(sig.s_adj);
            return (
              <div key={sig.coin} onClick={() => onSelect(sig.coin)}
                style={{ display: 'grid',
                  gridTemplateColumns: '24px 72px 140px 80px 60px 60px 60px 60px 60px',
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
                {/* Signal bar */}
                <div style={{ position: 'relative', height: 12, background: C.dimLow, borderRadius: 2, overflow: 'hidden' }}>
                  {/* Center line */}
                  <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: C.border, zIndex: 1 }} />
                  {/* Signal fill */}
                  <div style={{
                    position: 'absolute',
                    left:   sig.s_adj >= 0 ? '50%' : `${barPct}%`,
                    width:  `${Math.abs(sig.s_adj) / 4 * 100}%`,
                    top: 0, height: '100%',
                    background: sColor, opacity: 0.85, borderRadius: 1,
                  }} />
                  {/* Label */}
                  <span style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7.5, fontWeight: 700, color: '#fff', fontFamily: C.font, zIndex: 2,
                    textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                    {sig.s_adj >= 0 ? '+' : ''}{sig.s_adj.toFixed(2)}
                  </span>
                </div>
                {/* Side badge */}
                <span style={{ fontSize: 8, fontWeight: 700, color: sColor, fontFamily: C.font,
                  textAlign: 'center', letterSpacing: 0.5 }}>
                  {sig.side === 'long' ? '▲ LONG' : sig.side === 'short' ? '▼ SHORT' : '· FLAT'}
                </span>
                {/* Vol */}
                <span style={{ fontSize: 8.5, color: C.amber, fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.sigma.toFixed(0)}%
                </span>
                {/* 10d */}
                <span style={{ fontSize: 8.5, color: sig.momentum_10d == null ? C.dim : sig.momentum_10d >= 0 ? C.green : C.red,
                  fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.momentum_10d == null ? '—' : `${sig.momentum_10d >= 0 ? '+' : ''}${sig.momentum_10d.toFixed(1)}%`}
                </span>
                {/* 30d */}
                <span style={{ fontSize: 8.5, color: sig.momentum_30d == null ? C.dim : sig.momentum_30d >= 0 ? C.green : C.red,
                  fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.momentum_30d == null ? '—' : `${sig.momentum_30d >= 0 ? '+' : ''}${sig.momentum_30d.toFixed(1)}%`}
                </span>
                {/* Funding bps */}
                <span style={{ fontSize: 8.5, color: sig.funding_bps > 1 ? C.red : sig.funding_bps < -1 ? C.blue : C.dim,
                  fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.funding_bps >= 0 ? '+' : ''}{sig.funding_bps.toFixed(2)}
                </span>
                {/* Weight */}
                <span style={{ fontSize: 8.5, fontWeight: 700, color: sColor,
                  fontFamily: C.font, textAlign: 'right', paddingRight: 8 }}>
                  {sig.w_scaled >= 0 ? '+' : ''}{sig.w_scaled.toFixed(1)}%
                </span>
              </div>
            );
          })}

          {/* Show more / legend footer */}
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HyperliquidScreenerPage() {
  const [search,        setSearch]        = useState('');
  const [marketType,    setMarketType]    = useState<'all'|'perp'|'spot'>('perp');
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
  const [showMatrix,    setShowMatrix]    = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: raw, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery<
    { rows: ScreenerRow[]; meta: ScreenerMeta }
  >({
    queryKey: ['hl-screener', marketType],
    queryFn: async () => {
      const r = await fetch(`/api/hyperliquid/screener?market_type=${marketType}&limit=200`);
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      return r.json();
    },
    refetchInterval: liveUpdates ? 10000 : false,
    staleTime: 8000,
    gcTime: 30 * 60 * 1000,   // keep cache 30 min across navigations
    retry: 2,
    placeholderData: (previousData: any) => previousData,
  });

  // Permanent last-good-data ref — NEVER cleared, so the screen never goes
  // blank during refetches, backend restarts, or transient error states.
  const _lastGood = useRef<{ rows: ScreenerRow[]; meta: ScreenerMeta } | null>(null);
  if (raw != null) _lastGood.current = raw;
  const displayData = raw ?? _lastGood.current;

  // Merge agent results into rows for matrix colouring
  const rows: ScreenerRow[] = useMemo(() => {
    const base = displayData?.rows ?? [];
    if (!agentResult) return base;
    const am = new Map(agentResult.rankedCoins.map(a=>[a.coin,a]));
    return base.map(row => { const ag=am.get(row.coin); if(!ag) return row; return {...row, agentRank:ag.agentRank, agentScore:ag.agentScore, agentRationale:ag.rationale, rankDelta:row.rank-ag.agentRank}; });
  }, [displayData, agentResult]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) { const q=search.trim().toLowerCase(); r=r.filter(row=>row.coin.toLowerCase().includes(q)||(row.displayName??'').toLowerCase().includes(q)); }
    if (marketType !== 'all') r = r.filter(row => row.marketType === marketType);
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
    setSortKey(prev => { if(prev===key){setSortDir(d=>d==='asc'?'desc':'asc');return key;}setSortDir('asc');return key; });
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

      {/* ── TOP BAR (UNCHANGED) ──────────────────────────────────────── */}
      <div style={{ background:'#060b14', borderBottom:`1px solid ${C.border}`, padding:'0 12px', height:44, display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'nowrap', overflowX:'auto' }}>
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
        <div style={{ position:'relative', flexShrink:0 }}>
          <Search style={{ position:'absolute', left:7, top:'50%', transform:'translateY(-50%)', width:11, height:11, color:C.dim }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search coin…"
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 8px 4px 22px', fontSize:10, color:C.text, width:130, outline:'none' }} />
          {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:5, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.dim }}><X style={{ width:10, height:10 }} /></button>}
        </div>
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

      {/* ── FILTER BAR ───────────────────────────────────────────────── */}
      {showFilters && (
        <div style={{ background:C.card2, borderBottom:`1px solid ${C.border}`, padding:'6px 14px', display:'flex', gap:10, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
          <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:C.dim }}>
            Min Vol ($M): <input value={minVolume} onChange={e => setMinVolume(e.target.value)} placeholder="e.g. 10" style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:3, padding:'3px 6px', fontSize:10, color:C.text, width:70, outline:'none' }} />
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:C.dim }}>
            Min OI ($M): <input value={minOI} onChange={e => setMinOI(e.target.value)} placeholder="e.g. 5" style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:3, padding:'3px 6px', fontSize:10, color:C.text, width:70, outline:'none' }} />
          </label>
          <span style={{ fontSize:9, color:C.dim }}>Showing {sorted.length} / {rows.length} assets{dataUpdatedAt?` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`:''}</span>
        </div>
      )}

      {/* ── SUMMARY STRIP ────────────────────────────────────────────── */}
      <div style={{ background:'#07101a', borderBottom:`1px solid ${C.border}`, padding:'5px 12px', display:'flex', gap:7, overflowX:'auto', flexShrink:0, scrollbarWidth:'none', alignItems:'stretch' }}>
        {(isLoading && !displayData)
          ? Array.from({length:9}).map((_,i) => <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:'5px 11px', flexShrink:0, minWidth:96, height:40, opacity:0.3 }} />)
          : summaryItems.map(item => (
              <SummaryChip key={item.id} label={item.label} coin={item.coin} value={item.value} color={item.color}
                selected={!!item.coin && selectedCoin===item.coin}
                onClick={item.coin ? () => setSelectedCoin(item.coin!) : undefined} />
            ))
        }
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

        {displayData && (
          <>
            {/* ── HERO: AGENT MARKET BRIEF ─────────────────────────── */}
            <AgentMarketBrief
              agentResult={agentResult} agentLoading={agentLoading} agentStage={agentStage}
              rows={sorted} selectedCoin={selectedCoin} onSelect={setSelectedCoin} />

            {/* ── SIGNAL BOARDS ──────────────────────────────────────── */}
            {sorted.length > 0 && (
              <div style={{ padding:'12px 14px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:10 }}>
                {signalSections.map(sec => (
                  <SignalBoard key={sec.id} section={sec} selectedCoin={selectedCoin}
                    onSelect={setSelectedCoin} />
                ))}
              </div>
            )}


            {/* ── TSMOM MOMENTUM PANEL ──────────────────────────────── */}
            {sorted.length > 0 && (
              <MomentumPanel selectedCoin={selectedCoin} onSelect={setSelectedCoin} />
            )}

            {/* ── MARKET MATRIX (collapsible) ────────────────────────── */}
            {sorted.length > 0 && (
              <div style={{ margin:'0 14px 14px', border:`1px solid ${C.border}`, borderRadius:6, overflow:'hidden' }}>
                <button onClick={() => setShowMatrix(m => !m)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:C.card2, border:'none', cursor:'pointer', color:C.text, borderBottom:showMatrix?`1px solid ${C.border}`:'none' }}>
                  <BarChart2 style={{ width:11, height:11, color:C.teal }} />
                  <span style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, color:C.teal, textTransform:'uppercase' }}>Market Matrix</span>
                  <span style={{ fontSize:8.5, color:C.dim, marginLeft:4 }}>{sorted.length} assets</span>
                  <span style={{ marginLeft:'auto', color:C.dim }}>
                    {showMatrix ? <ChevronUp style={{ width:11, height:11 }} /> : <ChevronDown style={{ width:11, height:11 }} />}
                  </span>
                </button>
                {showMatrix && (
                  <div ref={tableRef} style={{ overflow:'auto', maxHeight:400 }}>
                    <table style={{ borderCollapse:'collapse', width:'max-content', minWidth:'100%' }}>
                      <thead>
                        <tr style={{ background:'#060b14', position:'sticky', top:0, zIndex:10 }}>
                          <th style={{ width:30, padding:'4px 7px', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}` }} />
                          {MAT_COLS.map(col => {
                            const isSorted = sortKey === col.key;
                            return (
                              <th key={col.key} onClick={() => handleSort(col.key)}
                                style={{ width:col.w, minWidth:col.w, padding:'4px 7px', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.dimLow}`, textAlign:col.align??'right', cursor:'pointer', userSelect:'none', background:isSorted?`${C.teal}12`:'transparent', whiteSpace:'nowrap', position:col.key==='coin'?'sticky':'static', left:col.key==='coin'?38:'auto', zIndex:col.key==='coin'?5:'auto' }}>
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
                        {sorted.map((row, idx) => {
                          const isSel   = selectedCoin === row.coin;
                          const isPinned= pinnedCoins.has(row.coin);
                          const isHi    = rowHighlights.has(row.coin);
                          const rowBg   = isSel?`${C.teal}18`:isPinned?`${C.amber}0c`:isHi?`${C.purple}18`:idx%2===0?C.bg:C.card2;
                          return (
                            <tr key={row.coin} data-coin={row.coin}
                              onClick={() => setSelectedCoin(c => c===row.coin?null:row.coin)}
                              onDoubleClick={e => togglePin(row.coin, e as any)}
                              style={{ background:rowBg, cursor:'pointer', height:rowH, transition:'background 0.15s', borderBottom:`1px solid ${C.dimLow}` }}
                              onMouseEnter={e => { if(!isSel)(e.currentTarget as HTMLElement).style.background=`${C.teal}0c`; }}
                              onMouseLeave={e => { if(!isSel)(e.currentTarget as HTMLElement).style.background=rowBg; }}>
                              <td onClick={e => togglePin(row.coin, e)} style={{ width:30, padding:'0 7px', borderRight:`1px solid ${C.border}`, textAlign:'center', position:'sticky', left:0, background:rowBg, zIndex:2, cursor:'pointer' }}>
                                <Pin style={{ width:9, height:9, color:isPinned?C.amber:C.dimLow, transform:isPinned?'none':'rotate(45deg)' }} />
                              </td>
                              {MAT_COLS.map(col => {
                                const v = row[col.key]; const txt=col.fmt(v); const clr=col.vc?col.vc(v):C.text;
                                return (
                                  <td key={col.key} style={{ padding:'0 7px', textAlign:col.align??'right', fontFamily:C.font, fontSize:density==='compact'?9:10, color:col.key==='coin'?C.text:clr, fontWeight:col.key==='coin'?700:400, whiteSpace:'nowrap', position:col.key==='coin'?'sticky':'static', left:col.key==='coin'?38:'auto', background:col.key==='coin'?rowBg:'transparent', zIndex:col.key==='coin'?2:'auto', borderRight:`1px solid ${C.dimLow}` }}>
                                    {col.key==='coin' ? <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>{isPinned&&<span style={{ color:C.amber, fontSize:8 }}>●</span>}{txt}</span> : txt}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
