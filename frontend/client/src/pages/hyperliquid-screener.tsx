import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Search, RefreshCw, Bot, X, ChevronDown, ChevronUp,
  ChevronsUpDown, AlertTriangle, Pin, ArrowUpRight, ArrowDownRight,
  Minus, Filter, Settings2, BarChart2, Zap, TrendingUp, TrendingDown,
} from 'lucide-react';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:      '#080c13',
  card:    '#0d1623',
  card2:   '#0a1020',
  hero:    '#0b1520',
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

// ─── Types ─────────────────────────────────────────────────────────────────────
// Contract: GET /api/hyperliquid/screener/snapshot → { rows, meta }
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

// Contract: POST /api/hyperliquid/screener/agent-rank → AgentResult
export interface AgentResult {
  rankedCoins:    AgentRankedItem[];
  longs:          AgentRankedItem[];
  shorts:         AgentRankedItem[];
  breakouts:      AgentRankedItem[];
  meanReversions: AgentRankedItem[];
  avoid:          AgentRankedItem[];
  summary:        string;
  generatedAt:    string;
}
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

// Contract: GET /api/hyperliquid/screener/asset/:coin → AssetDetail
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
const pct   = (v: number | null, dec = 2) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(dec)}%`;
const $$    = (v: number | null) => v == null ? '—' : v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` : `$${v.toFixed(2)}`;
const px    = (v: number | null) => v == null ? '—' : v >= 1000 ? v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : v >= 1 ? v.toFixed(3) : v.toFixed(6);
const sc    = (v: number | null) => v == null ? '—' : v.toFixed(2);
const nn    = (v: number | null) => v == null ? '—' : v.toLocaleString();
const fmtF  = (v: number | null) => v == null ? '—' : `${(v*100).toFixed(4)}%`;
const fmtD  = (v: number | null) => pct(v == null ? null : v*100, 4);
const pctC  = (v: number | null) => v == null ? C.dim : v > 0 ? C.green : v < 0 ? C.red : C.dim;
const scC   = (v: number | null) => v == null ? C.dim : v >= 0.6 ? C.green : v <= 0.35 ? C.red : C.amber;
const fC    = (v: number | null) => v == null ? C.dim : v > 0.001 ? C.green : v < -0.001 ? C.red : C.dim;

// ─── Setup helpers ────────────────────────────────────────────────────────────
const SETUP_MAP: Record<string, { label: string; color: string }> = {
  breakout:           { label: 'Breakout',    color: C.green  },
  mean_reversion:     { label: 'Mean Rev',    color: C.blue   },
  trend_continuation: { label: 'Trend',       color: C.teal   },
  crowding_unwind:    { label: 'Crowd Unwind',color: C.amber  },
  avoid:              { label: 'Avoid',        color: C.red    },
  neutral:            { label: 'Neutral',     color: C.dim    },
};
const DIR_MAP: Record<string, { label: string; color: string }> = {
  long:    { label: 'LONG',  color: C.green  },
  short:   { label: 'SHORT', color: C.red    },
  avoid:   { label: 'AVOID', color: C.amber  },
  neutral: { label: 'WATCH', color: C.dim    },
};
const rankColor = (r: number) => r === 1 ? C.gold : r === 2 ? C.silver : r === 3 ? C.amber : C.dim;

// ─── Signal section derivation ────────────────────────────────────────────────
interface DerivedSection {
  id: string; title: string; subtitle: string; color: string; always: boolean;
  items: { coin: string; primary: string; secondary?: string; direction: 'up' | 'down' | 'neutral' }[];
}
const dedup = (arr: ScreenerRow[]) => { const s = new Set<string>(); return arr.filter(r => { if (s.has(r.coin)) return false; s.add(r.coin); return true; }); };
const topN  = (arr: ScreenerRow[], key: keyof ScreenerRow, n = 6, asc = false) =>
  dedup([...arr].filter(r => r[key] != null).sort((a,b) => asc ? (a[key] as number)-(b[key] as number) : (b[key] as number)-(a[key] as number))).slice(0,n);
const topNA = (arr: ScreenerRow[], key: keyof ScreenerRow, n = 6) =>
  dedup([...arr].filter(r => r[key] != null).sort((a,b) => Math.abs(b[key] as number)-Math.abs(a[key] as number))).slice(0,n);

function deriveSignalSections(rows: ScreenerRow[]): DerivedSection[] {
  const mk = (
    id: string, title: string, subtitle: string, color: string, always: boolean,
    src: ScreenerRow[], pF: (r: ScreenerRow) => string, sF?: (r: ScreenerRow) => string,
    dF?: (r: ScreenerRow) => 'up'|'down'|'neutral',
  ): DerivedSection => ({ id, title, subtitle, color, always, items: src.map(r => ({ coin: r.coin, primary: pF(r), secondary: sF?.(r), direction: dF?.(r) ?? 'neutral' })) });

  const up = () => 'up' as const; const dn = () => 'down' as const;
  const aD = (r: ScreenerRow) => (r.change24hPct ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const fD = (r: ScreenerRow) => (r.funding ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const iD = (r: ScreenerRow) => (r.bidAskImbalance ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const tD = (r: ScreenerRow) => (r.tradeImbalance ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const oD = (r: ScreenerRow) => (r.distMarkOracle ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const pD = (r: ScreenerRow) => (r.premium ?? 0) >= 0 ? 'up' as const : 'down' as const;

  // Conditional: only show if non-empty
  const sq = rows.filter(r => (r.funding??0)>0.02 && r.signalDirection==='bearish').sort((a,b)=>(b.funding??0)-(a.funding??0)).slice(0,6);
  const ll = rows.filter(r => (r.funding??0)<-0.02 && r.signalDirection==='bullish').sort((a,b)=>(a.funding??0)-(b.funding??0)).slice(0,6);
  const cl = rows.filter(r => r.signalDirection==='bullish').sort((a,b)=>(b.compositeSignal??0)-(a.compositeSignal??0)).slice(0,6);
  const cs = rows.filter(r => r.signalDirection==='bearish').sort((a,b)=>(a.compositeSignal??1)-(b.compositeSignal??1)).slice(0,6);
  const oi_u = topN(rows, 'oiChangePct', 6);
  const oi_d = topN(rows, 'oiChangePct', 6, true);
  const vi   = topN(rows, 'volumeImpulse', 6);

  return [
    // ── Always-shown (derived from basic fields always present) ──
    mk('gainers',   'Top Gainers',       'Strongest 24h price movers',      C.green,  true, topN(rows,'change24hPct',6),      r => pct(r.change24hPct),  r => px(r.markPrice), up),
    mk('losers',    'Top Losers',        'Sharpest 24h price declines',     C.red,    true, topN(rows,'change24hPct',6,true), r => pct(r.change24hPct),  r => px(r.markPrice), dn),
    mk('fund-hi',   'High Funding',      'Longs paying — squeeze watch',    C.green,  true, topN(rows,'funding',6),           r => fmtF(r.funding),      r => $$(r.openInterest), fD),
    mk('fund-lo',   'Neg Funding',       'Shorts paying — flush watch',     C.blue,   true, topN(rows,'funding',6,true),      r => fmtF(r.funding),      r => $$(r.openInterest), fD),
    mk('disloc',    'Mark/Oracle Gap',   'Largest mark vs oracle delta',    C.amber,  true, topNA(rows,'distMarkOracle',6),   r => fmtD(r.distMarkOracle), r => px(r.markPrice), oD),
    mk('premium',   'Premium/Discount',  'Mark vs mid price dislocation',   C.cyan,   true, topNA(rows,'premium',6),          r => fmtD(r.premium),      r => fmtF(r.funding), pD),
    mk('vol-top',   'Volume Leaders',    'Largest 24h notional volume',     C.teal,   true, topN(rows,'volume24h',6),         r => $$(r.volume24h),      r => $$(r.openInterest), aD),
    mk('trade-imbl','Trade Flow',        'Buy vs sell trade pressure',      C.teal,   true, topNA(rows,'tradeImbalance',6),   r => r.tradeImbalance==null?'—':r.tradeImbalance.toFixed(3), r => nn(r.tradeCount), tD),
    mk('book-imbl', 'Book Imbalance',    'Order book bid/ask skew',         C.purple, true, topNA(rows,'bidAskImbalance',6),  r => r.bidAskImbalance==null?'—':r.bidAskImbalance.toFixed(3), r => $$(r.bidDepth), iD),
    mk('volscore',  'Volatility Leaders','Highest realized vol score',      C.amber,  true, topN(rows,'volatility',6),        r => sc(r.volatility),     r => pct(r.change24hPct), aD),
    // ── Conditional: only render if non-empty ──
    mk('oi-expand', 'OI Expansion',      'Largest open interest build',     C.amber,  false, oi_u, r => pct(r.oiChangePct),   r => $$(r.openInterest), up),
    mk('oi-unwind', 'OI Unwind',         'Largest OI liquidation',          C.red,    false, oi_d, r => pct(r.oiChangePct),   r => $$(r.openInterest), dn),
    mk('vol-imp',   'Vol Impulse',       'Recent volume spike vs avg',      C.teal,   false, vi,   r => sc(r.volumeImpulse),  r => $$(r.volume24h), up),
    mk('short-sqz', 'Short Squeeze',     'High funding + bearish OI',       C.red,    false, sq,   r => fmtF(r.funding),      r => pct(r.oiChangePct), up),
    mk('long-liq',  'Long Flush',        'Negative funding + bull OI',      C.red,    false, ll,   r => fmtF(r.funding),      r => pct(r.oiChangePct), dn),
    mk('crowd-long','Crowded Longs',     'High signal + bullish crowd',     C.amber,  false, cl,   r => sc(r.compositeSignal),r => $$(r.openInterest), up),
    mk('crowd-short','Crowded Shorts',   'Low signal + bearish crowd',      C.purple, false, cs,   r => sc(r.compositeSignal),r => $$(r.openInterest), dn),
  ].filter(s => s.always || s.items.length > 0);
}

// ─── Summary chip ─────────────────────────────────────────────────────────────
function SummaryChip({ label, coin, value, color, selected, onClick }: {
  label: string; coin?: string|null; value: string; color?: string; selected?: boolean; onClick?: () => void;
}) {
  const col = color ?? C.teal;
  return (
    <div onClick={onClick} style={{ background: selected ? `${col}1a` : C.card, border: `1px solid ${selected ? col : C.border}`, borderRadius: 5, padding: '5px 11px', flexShrink: 0, cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s', minWidth: 96 }}>
      <div style={{ fontSize: 7.5, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: col, fontFamily: C.font, lineHeight: 1 }}>
        {coin && <span style={{ marginRight: 4 }}>{coin}</span>}{value}
      </div>
    </div>
  );
}

// ─── Hero: Ranked Idea Row ─────────────────────────────────────────────────────
function IdeaRow({ item, rank, selected, prevRank, onClick }: {
  item: AgentRankedItem; rank: number; selected: boolean; prevRank?: number; onClick: () => void;
}) {
  const dir  = DIR_MAP[item.direction] ?? DIR_MAP.neutral;
  const setup = item.setupType ? (SETUP_MAP[item.setupType] ?? SETUP_MAP.neutral) : DIR_MAP[item.direction];
  const moved = item.rankMovement;
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.dimLow}`, background: selected ? `${C.purple}18` : 'transparent', transition: 'background 0.15s', position: 'relative' }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = `${C.purple}0d`; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
      {/* Rank badge */}
      <div style={{ width: 24, height: 24, borderRadius: 4, background: `${rankColor(rank)}22`, border: `1px solid ${rankColor(rank)}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: rankColor(rank), fontFamily: C.font }}>#{rank}</span>
      </div>
      {/* Coin */}
      <span style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: C.font, flexShrink: 0, minWidth: 60 }}>{item.coin}</span>
      {/* Direction badge */}
      <span style={{ fontSize: 8.5, fontWeight: 700, color: dir.color, background: `${dir.color}18`, border: `1px solid ${dir.color}44`, borderRadius: 3, padding: '2px 6px', flexShrink: 0 }}>{dir.label}</span>
      {/* Setup */}
      <span style={{ fontSize: 8, color: setup.color, background: `${setup.color}10`, border: `1px solid ${setup.color}33`, borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>{setup.label}</span>
      {/* Score bar */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: C.dimLow, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(item.agentScore * 100).toFixed(0)}%`, background: `linear-gradient(90deg,${C.purple},${C.teal})`, borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: C.purple, fontFamily: C.font, flexShrink: 0 }}>{item.agentScore.toFixed(2)}</span>
      </div>
      {/* Confidence */}
      <span style={{ fontSize: 8.5, color: scC(item.confidence), flexShrink: 0 }}>{(item.confidence*100).toFixed(0)}%</span>
      {/* Rank movement */}
      {moved != null && moved !== 0 && (
        <span style={{ fontSize: 8, fontWeight: 700, color: moved > 0 ? C.green : C.red, flexShrink: 0 }}>{moved > 0 ? `▲${moved}` : `▼${Math.abs(moved)}`}</span>
      )}
    </div>
  );
}

// ─── Hero: Thesis Panel ────────────────────────────────────────────────────────
function ThesisPanel({ item, row }: { item: AgentRankedItem | null; row: ScreenerRow | null }) {
  if (!item || !row) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <Bot style={{ width: 32, height: 32, color: C.dimLow, marginBottom: 12 }} />
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>Select a signal from the list</div>
        <div style={{ fontSize: 9.5, color: C.dimLow, maxWidth: 180, lineHeight: 1.6 }}>Click any ranked idea to see the full thesis and market context</div>
      </div>
    );
  }
  const dir   = DIR_MAP[item.direction] ?? DIR_MAP.neutral;
  const setup = item.setupType ? (SETUP_MAP[item.setupType] ?? SETUP_MAP.neutral) : DIR_MAP[item.direction];
  const M = ({ label, value, vc }: { label: string; value: string; vc?: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 0', borderBottom: `1px solid ${C.dimLow}` }}>
      <span style={{ fontSize: 7.5, color: C.dim, textTransform: 'uppercase', letterSpacing: 1.2 }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: C.font, fontWeight: 600, color: vc ?? C.text }}>{value}</span>
    </div>
  );
  const contribs = item.featureContributions ? Object.entries(item.featureContributions).sort((a,b) => b[1]-a[1]).slice(0,5) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Thesis header */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.card2, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: C.font, fontWeight: 800, fontSize: 16, color: C.text }}>{item.coin}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: dir.color, background: `${dir.color}18`, border: `1px solid ${dir.color}44`, borderRadius: 3, padding: '2px 7px' }}>{dir.label}</span>
          <span style={{ fontSize: 8.5, color: setup.color, background: `${setup.color}12`, border: `1px solid ${setup.color}33`, borderRadius: 3, padding: '1px 6px' }}>{setup.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: C.purple, fontFamily: C.font }}>
            Score: {item.agentScore.toFixed(2)}
          </span>
        </div>
        <div style={{ fontSize: 9.5, color: C.dim, lineHeight: 1.5 }}>
          Confidence: <span style={{ color: scC(item.confidence) }}>{(item.confidence*100).toFixed(0)}%</span>
          {item.rankMovement != null && item.rankMovement !== 0 && (
            <span style={{ marginLeft: 10, color: item.rankMovement > 0 ? C.green : C.red }}>
              {item.rankMovement > 0 ? `▲${item.rankMovement}` : `▼${Math.abs(item.rankMovement)}`} vs prior rank
            </span>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginTop: 4 }}>
          <M label="Mark Price"    value={px(row.markPrice)} />
          <M label="24H Change"    value={pct(row.change24hPct)} vc={pctC(row.change24hPct)} />
          <M label="Funding/hr"    value={fmtF(row.funding)}    vc={fC(row.funding)} />
          <M label="Open Interest" value={$$(row.openInterest)} />
          <M label="24H Volume"    value={$$(row.volume24h)} />
          <M label="Oracle Price"  value={px(row.oraclePrice)} />
          <M label="Mark/Oracle Δ" value={fmtD(row.distMarkOracle)} vc={pctC(row.distMarkOracle)} />
          <M label="Premium/Disc"  value={fmtD(row.premium)}   vc={pctC(row.premium)} />
          <M label="Trade Flow"    value={row.tradeImbalance==null?'—':row.tradeImbalance.toFixed(3)} vc={pctC(row.tradeImbalance)} />
          <M label="Book Imbal"    value={row.bidAskImbalance==null?'—':row.bidAskImbalance.toFixed(3)} vc={pctC(row.bidAskImbalance)} />
          <M label="Vol Regime"    value={sc(row.volatility)} vc={scC(row.volatility)} />
          <M label="Composite Sig" value={sc(row.compositeSignal)} vc={scC(row.compositeSignal)} />
        </div>
        {/* Thesis */}
        {(item.thesis || item.rationale) && (
          <>
            <div style={{ fontSize: 7.5, color: C.purple, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800, marginTop: 14, marginBottom: 6 }}>Agent Thesis</div>
            <div style={{ fontSize: 9.5, color: C.text, lineHeight: 1.7, background: `${C.purple}0d`, border: `1px solid ${C.purple}33`, borderRadius: 5, padding: '8px 10px' }}>
              {item.thesis ?? item.rationale}
            </div>
          </>
        )}
        {/* Feature contributions */}
        {contribs && contribs.length > 0 && (
          <>
            <div style={{ fontSize: 7.5, color: C.teal, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800, marginTop: 12, marginBottom: 6 }}>Signal Drivers</div>
            {contribs.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 8.5, color: C.dim, minWidth: 110 }}>{k.replace(/_/g,' ')}</span>
                <div style={{ flex: 1, height: 4, background: C.dimLow, borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, v*100).toFixed(0)}%`, background: C.teal, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 8.5, fontFamily: C.font, color: C.teal, flexShrink: 0 }}>{(v*100).toFixed(0)}%</span>
              </div>
            ))}
          </>
        )}
        {/* Risk note */}
        {item.riskNote && (
          <>
            <div style={{ fontSize: 7.5, color: C.amber, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800, marginTop: 12, marginBottom: 6 }}>Risk / Invalidation</div>
            <div style={{ fontSize: 9.5, color: C.text, lineHeight: 1.7, background: `${C.amber}0d`, border: `1px solid ${C.amber}44`, borderRadius: 5, padding: '7px 10px' }}>
              {item.riskNote}
            </div>
          </>
        )}
        {/* Extra row metrics */}
        <div style={{ fontSize: 7.5, color: C.dim, marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {row.maxLeverage != null && <span>Max lev: {row.maxLeverage}×</span>}
          {row.oiChangePct != null && <span>OI Δ: <span style={{ color: pctC(row.oiChangePct) }}>{pct(row.oiChangePct)}</span></span>}
          {row.updatedAt && <span>Updated: {new Date(row.updatedAt).toLocaleTimeString()}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ agentResult, agentLoading, agentStage, rows, selectedCoin, onSelect, onRunAgent }: {
  agentResult: AgentResult | null; agentLoading: boolean; agentStage: string;
  rows: ScreenerRow[]; selectedCoin: string | null; onSelect: (coin: string) => void; onRunAgent: () => void;
}) {
  // Use agent ranked list if available, else top 5 by compositeSignal as preview
  const ideas: AgentRankedItem[] = useMemo(() => {
    if (agentResult) return agentResult.rankedCoins.slice(0, 5);
    // Pre-agent preview: derive from compositeSignal
    return [...rows]
      .filter(r => r.compositeSignal != null)
      .sort((a,b) => (b.compositeSignal!-a.compositeSignal!))
      .slice(0,5)
      .map((r, i) => ({
        coin: r.coin, agentRank: i+1, agentScore: r.compositeSignal!, direction: r.signalDirection === 'bullish' ? 'long' : r.signalDirection === 'bearish' ? 'short' : 'neutral' as any,
        setupType: null, confidence: r.signalConfidence ?? 0.5, rationale: r.agentRationale ?? '', thesis: null, riskNote: null, rankMovement: null,
      }));
  }, [agentResult, rows]);

  const [localSelected, setLocalSelected] = useState<number>(0);
  const effSelected = Math.min(localSelected, ideas.length - 1);
  const selectedItem = ideas[effSelected] ?? null;
  const selectedRow  = selectedItem ? rows.find(r => r.coin === selectedItem.coin) ?? null : null;
  const isPreview    = !agentResult;

  return (
    <div style={{ background: C.hero, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
      {/* Hero header */}
      <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.dimLow}` }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: agentLoading ? C.amber : agentResult ? C.purple : C.dim, boxShadow: agentResult ? `0 0 8px ${C.purple}` : 'none', transition: 'all 0.3s' }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: agentResult ? C.purple : C.dim, textTransform: 'uppercase' }}>
            Agent Top Signals
          </div>
          <div style={{ fontSize: 8.5, color: C.dim }}>
            {agentLoading ? agentStage : agentResult ? `AI-ranked · ${new Date(agentResult.generatedAt).toLocaleTimeString()}` : 'Composite score preview — run Agent for AI-ranked signals'}
          </div>
        </div>
        {isPreview && !agentLoading && (
          <button onClick={onRunAgent} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 4, background: `linear-gradient(135deg,${C.purple},#7c3aed)`, border: `1px solid ${C.purple}`, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>
            <Bot style={{ width: 12, height: 12 }} /> Run Agent
          </button>
        )}
        {agentLoading && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, border: `2px solid ${C.border}`, borderTopColor: C.purple, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 9.5, color: C.purple }}>{agentStage}</span>
          </div>
        )}
        {agentResult && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {agentResult.longs.slice(0,2).map(a => (
              <span key={a.coin} style={{ fontSize: 8.5, fontWeight: 700, color: C.green, background: `${C.green}11`, border: `1px solid ${C.green}33`, borderRadius: 3, padding: '2px 7px', fontFamily: C.font }}>▲ {a.coin}</span>
            ))}
            {agentResult.shorts.slice(0,2).map(a => (
              <span key={a.coin} style={{ fontSize: 8.5, fontWeight: 700, color: C.red, background: `${C.red}11`, border: `1px solid ${C.red}33`, borderRadius: 3, padding: '2px 7px', fontFamily: C.font }}>▼ {a.coin}</span>
            ))}
          </div>
        )}
      </div>
      {/* Hero body */}
      <div style={{ display: 'flex', height: 270 }}>
        {/* Left: ranked list */}
        <div style={{ width: 420, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          {ideas.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              {agentLoading
                ? <div style={{ fontSize: 9.5, color: C.dim }}>Analyzing markets…</div>
                : <div style={{ fontSize: 9.5, color: C.dim, textAlign: 'center', padding: '0 20px', lineHeight: 1.6 }}>No market data available. Ensure the screener is loaded before running the agent.</div>
              }
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{ display: 'flex', gap: 10, padding: '4px 14px', borderBottom: `1px solid ${C.dimLow}` }}>
                <span style={{ fontSize: 7.5, color: C.dim, minWidth: 24 }}>#</span>
                <span style={{ fontSize: 7.5, color: C.dim, minWidth: 60 }}>COIN</span>
                <span style={{ fontSize: 7.5, color: C.dim }}>DIR · SETUP</span>
                <span style={{ fontSize: 7.5, color: C.dim, marginLeft: 'auto' }}>SCORE · CONF</span>
              </div>
              {ideas.map((item, i) => (
                <IdeaRow key={item.coin} item={item} rank={i+1} selected={effSelected === i}
                  onClick={() => { setLocalSelected(i); onSelect(item.coin); }} />
              ))}
              {isPreview && (
                <div style={{ padding: '7px 14px', fontSize: 8.5, color: C.dimLow, textAlign: 'center', borderTop: `1px solid ${C.dimLow}`, marginTop: 'auto' }}>
                  Preview only — click Agent for full AI analysis
                </div>
              )}
            </>
          )}
        </div>
        {/* Right: thesis panel */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ThesisPanel item={selectedItem} row={selectedRow} />
        </div>
      </div>
    </div>
  );
}

// ─── Signal Board Card ─────────────────────────────────────────────────────────
function SignalBoard({ section, selectedCoin, onSelect }: {
  section: DerivedSection; selectedCoin: string | null; onSelect: (coin: string) => void;
}) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, borderTop: `2px solid ${section.color}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px 4px', borderBottom: `1px solid ${C.dimLow}`, flexShrink: 0 }}>
        <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5, color: section.color, textTransform: 'uppercase' }}>{section.title}</div>
        <div style={{ fontSize: 7.5, color: C.dim, marginTop: 1 }}>{section.subtitle}</div>
      </div>
      {section.items.map((item, i) => {
        const sel = selectedCoin === item.coin;
        const dirC = item.direction === 'up' ? C.green : item.direction === 'down' ? C.red : C.dim;
        return (
          <div key={item.coin} onClick={() => onSelect(item.coin)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', cursor: 'pointer', transition: 'background 0.1s', background: sel ? `${section.color}15` : 'transparent', borderBottom: i < section.items.length-1 ? `1px solid ${C.dimLow}` : 'none' }}
            onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = `${section.color}09`; }}
            onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <span style={{ fontSize: 7.5, color: C.dimLow, fontFamily: C.font, minWidth: 12, textAlign: 'right', flexShrink: 0 }}>{i+1}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: sel ? section.color : C.text, fontFamily: C.font, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.coin}</span>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: dirC, fontFamily: C.font, flexShrink: 0 }}>{item.primary}</span>
            {item.secondary && <span style={{ fontSize: 7.5, color: C.dim, flexShrink: 0 }}>{item.secondary}</span>}
            <span style={{ fontSize: 7.5, color: dirC, flexShrink: 0 }}>{item.direction === 'up' ? '▲' : item.direction === 'down' ? '▼' : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Market Matrix Columns ────────────────────────────────────────────────────
type CK = keyof ScreenerRow;
interface Col { key: CK; label: string; w: number; fmt: (v:any) => string; vc?: (v:any) => string; align?: 'left'|'right' }
const MAT_COLS: Col[] = [
  { key:'coin',            label:'COIN',    w:90,  fmt: v=>v??'—',               align:'left'  },
  { key:'markPrice',       label:'MARK',    w:100, fmt: px                                       },
  { key:'change24hPct',    label:'24H%',    w:72,  fmt: pct,    vc: pctC                         },
  { key:'funding',         label:'FUND%',   w:80,  fmt: fmtF,   vc: fC                           },
  { key:'openInterest',    label:'OI',      w:90,  fmt: $$                                       },
  { key:'volume24h',       label:'VOL',     w:90,  fmt: $$                                       },
  { key:'premium',         label:'PREM%',   w:80,  fmt: fmtD,   vc: pctC                         },
  { key:'distMarkOracle',  label:'MK-ORC%', w:80,  fmt: fmtD,   vc: pctC                         },
  { key:'bidAskImbalance', label:'BK-IMB',  w:72,  fmt: v=>v==null?'—':v.toFixed(3), vc: pctC   },
  { key:'tradeImbalance',  label:'TR-IMB',  w:72,  fmt: v=>v==null?'—':v.toFixed(3), vc: pctC   },
  { key:'volatility',      label:'VOL-S',   w:68,  fmt: sc,     vc: scC                          },
  { key:'compositeSignal', label:'SIG',     w:68,  fmt: sc,     vc: scC                          },
  { key:'agentScore',      label:'A-SCR',   w:68,  fmt: sc,     vc: scC                          },
  { key:'agentRank',       label:'A-RNK',   w:60,  fmt: v=>v??'—'                               },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HyperliquidScreenerPage() {
  const [search,       setSearch]       = useState('');
  const [marketType,   setMarketType]   = useState<'all'|'perp'|'spot'>('all');
  const [minVolume,    setMinVolume]    = useState('');
  const [minOI,        setMinOI]        = useState('');
  const [signalFilter, setSignalFilter] = useState<'all'|'bullish'|'bearish'>('all');
  const [sortKey,      setSortKey]      = useState<CK>('rank');
  const [sortDir,      setSortDir]      = useState<'asc'|'desc'>('asc');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [liveUpdates,  setLiveUpdates]  = useState(true);
  const [autoRerank,   setAutoRerank]   = useState(false);
  const [density,      setDensity]      = useState<'compact'|'comfortable'>('compact');
  const [selectedCoin, setSelectedCoin] = useState<string|null>(null);
  const [pinnedCoins,  setPinnedCoins]  = useState<Set<string>>(new Set());
  const [agentResult,  setAgentResult]  = useState<AgentResult|null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError,   setAgentError]   = useState<string|null>(null);
  const [agentStage,   setAgentStage]   = useState('');
  const [showFilters,  setShowFilters]  = useState(false);
  const [rowHighlights,setRowHighlights]= useState<Set<string>>(new Set());
  const [showMatrix,   setShowMatrix]   = useState(false);
  const [activePanel,  setActivePanel]  = useState<'detail'|'agent'>('detail');
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
    staleTime: 6000,
    retry: 2,
  });

  const { data: assetDetail } = useQuery<AssetDetail>({
    queryKey: ['hl-asset', selectedCoin],
    queryFn: async () => {
      const r = await fetch(`/api/hyperliquid/asset/${encodeURIComponent(selectedCoin!)}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!selectedCoin,
    staleTime: 12000,
    retry: 1,
  });

  const rows: ScreenerRow[] = useMemo(() => {
    const base = raw?.rows ?? [];
    if (!agentResult) return base;
    const am = new Map(agentResult.rankedCoins.map(a => [a.coin, a]));
    return base.map(row => { const ag = am.get(row.coin); if (!ag) return row; return { ...row, agentRank: ag.agentRank, agentScore: ag.agentScore, agentRationale: ag.rationale, rankDelta: row.rank - ag.agentRank }; });
  }, [raw, agentResult]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) { const q = search.trim().toLowerCase(); r = r.filter(row => row.coin.toLowerCase().includes(q) || (row.displayName??'').toLowerCase().includes(q)); }
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
      const av = a[sortKey] as any, bv = b[sortKey] as any;
      if (av==null&&bv==null) return 0; if (av==null) return 1; if (bv==null) return -1;
      const d = av<bv?-1:av>bv?1:0; return sortDir==='asc'?d:-d;
    };
    return [...pinned, ...rest.sort(cmp)];
  }, [filtered, sortKey, sortDir, pinnedCoins]);

  const signalSections = useMemo(() => deriveSignalSections(sorted), [sorted]);

  const summaryItems = useMemo(() => {
    const meta = raw?.meta;
    if (!rows.length && !meta) return [];
    const top  = (key: keyof ScreenerRow, asc=false) => [...rows].filter(r=>r[key]!=null).sort((a,b)=>asc?(a[key] as number)-(b[key] as number):(b[key] as number)-(a[key] as number))[0];
    const topA = (key: keyof ScreenerRow) => [...rows].filter(r=>r[key]!=null).sort((a,b)=>Math.abs(b[key] as number)-Math.abs(a[key] as number))[0];
    const g=top('change24hPct'), l=top('change24hPct',true), fh=top('funding'), fl=top('funding',true), d=topA('distMarkOracle'), v=top('volume24h'), bi=topA('bidAskImbalance');
    return [
      { id:'g',  label:'Top Gainer',    coin:g?.coin,  value:g?pct(g.change24hPct):'—',     color:C.green  },
      { id:'l',  label:'Top Loser',     coin:l?.coin,  value:l?pct(l.change24hPct):'—',     color:C.red    },
      { id:'fh', label:'High Funding',  coin:fh?.coin, value:fh?fmtF(fh.funding):'—',       color:C.green  },
      { id:'fl', label:'Neg Funding',   coin:fl?.coin, value:fl?fmtF(fl.funding):'—',       color:C.blue   },
      { id:'d',  label:'Mk/Oracle Gap', coin:d?.coin,  value:d?fmtD(d.distMarkOracle):'—',  color:C.amber  },
      { id:'v',  label:'Vol Leader',    coin:v?.coin,  value:v?$$(v.volume24h):'—',          color:C.teal   },
      { id:'bi', label:'Book Imbal',    coin:bi?.coin, value:bi?(bi.bidAskImbalance!).toFixed(3):'—', color:C.purple },
      { id:'ag', label:'Agent Top',     coin:agentResult?.longs[0]?.coin, value:agentResult?.longs[0]?agentResult.longs[0].agentScore.toFixed(2):'—', color:C.purple },
      { id:'ts', label:'Updated',       coin:null, value:meta?.lastUpdated?new Date(meta.lastUpdated).toLocaleTimeString():dataUpdatedAt?new Date(dataUpdatedAt).toLocaleTimeString():'—', color:C.dim },
    ];
  }, [raw, rows, agentResult, dataUpdatedAt]);

  const handleSort = useCallback((key: CK) => {
    setSortKey(prev => { if (prev===key) { setSortDir(d=>d==='asc'?'desc':'asc'); return key; } setSortDir('asc'); return key; });
  }, []);

  const runAgent = useCallback(async () => {
    setAgentLoading(true); setAgentError(null); setAgentStage('Sending to agent…');
    try {
      const payload = { rows: sorted.slice(0,100).map(r => ({ coin:r.coin, markPrice:r.markPrice, change24hPct:r.change24hPct, funding:r.funding, premium:r.premium, openInterest:r.openInterest, oiChangePct:r.oiChangePct, volume24h:r.volume24h, volumeImpulse:r.volumeImpulse, compositeSignal:r.compositeSignal, signalDirection:r.signalDirection, signalConfidence:r.signalConfidence, momentum:r.momentum, breakoutScore:r.breakoutScore, meanReversionScore:r.meanReversionScore, liquidityScore:r.liquidityScore, flowScore:r.flowScore, volatility:r.volatility, bidAskImbalance:r.bidAskImbalance, tradeImbalance:r.tradeImbalance, distMarkOracle:r.distMarkOracle })) };
      setAgentStage('Agent analyzing…');
      const res = await fetch('/api/hyperliquid/agent-rank', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Agent returned ${res.status}`);
      const data: AgentResult = await res.json();
      setAgentResult(data);
      const highlights = new Set(data.rankedCoins.filter(r => Math.abs(r.agentRank-(rows.find(x=>x.coin===r.coin)?.rank??r.agentRank))>=3).map(r=>r.coin));
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

  const meta = raw?.meta;
  const selectedRow = sorted.find(r => r.coin === selectedCoin) ?? null;
  const rowH = density === 'compact' ? 26 : 34;

  const Btn = ({ onClick, active, children, color }: { onClick:()=>void; active?:boolean; children:React.ReactNode; color?:string }) => (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:4, border:`1px solid ${active?(color??C.teal):C.border}`, background:active?`${color??C.teal}22`:C.card, color:active?(color??C.teal):C.dim, fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', letterSpacing:0.5, transition:'all 0.12s' }}>
      {children}
    </button>
  );
  const Toggle = ({ label, value, onChange }: { label:string; value:boolean; onChange:()=>void }) => (
    <button onClick={onChange} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:4, border:`1px solid ${value?C.teal:C.border}`, background:value?`${C.teal}18`:C.card, color:value?C.teal:C.dim, fontSize:10, cursor:'pointer', whiteSpace:'nowrap' }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:value?C.teal:C.dim, transition:'background 0.15s', flexShrink:0 }} />
      {label}
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
        <select value={marketType} onChange={e => setMarketType(e.target.value as any)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 8px', fontSize:10, color:C.text, cursor:'pointer', flexShrink:0 }}>
          <option value="all">All Markets</option><option value="perp">Perps Only</option><option value="spot">Spot Only</option>
        </select>
        <select value={signalFilter} onChange={e => setSignalFilter(e.target.value as any)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 8px', fontSize:10, color:C.text, cursor:'pointer', flexShrink:0 }}>
          <option value="all">All Signals</option><option value="bullish">Bullish Only</option><option value="bearish">Bearish Only</option>
        </select>
        <Btn onClick={() => setShowFilters(f => !f)} active={showFilters}><Filter style={{ width:10, height:10 }} /> Filters</Btn>
        <div style={{ width:1, height:22, background:C.border, flexShrink:0, margin:'0 4px' }} />
        <Toggle label="Live"      value={liveUpdates} onChange={() => setLiveUpdates(v => !v)} />
        <Toggle label="Auto-rank" value={autoRerank}  onChange={() => setAutoRerank(v => !v)} />
        <Toggle label="Advanced"  value={showAdvanced}onChange={() => setShowAdvanced(v => !v)} />
        <Btn onClick={() => setDensity(d => d==='compact'?'comfortable':'compact')}><Settings2 style={{ width:10, height:10 }} /> {density==='compact'?'Compact':'Comfort'}</Btn>
        <div style={{ flex:1 }} />
        <Btn onClick={() => refetch()}><RefreshCw style={{ width:10, height:10, ...(isFetching?{animation:'spin 1s linear infinite'}:{}) }} /> Refresh</Btn>
        <button onClick={runAgent} disabled={agentLoading} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:4, background:agentLoading?`${C.purple}33`:`linear-gradient(135deg,${C.purple},#7c3aed)`, border:`1px solid ${C.purple}`, color:'#fff', fontSize:10, fontWeight:700, cursor:agentLoading?'not-allowed':'pointer', letterSpacing:0.5, flexShrink:0, transition:'all 0.15s' }}>
          <Bot style={{ width:12, height:12 }} />{agentLoading?(agentStage||'Running…'):'Agent'}
        </button>
        <Btn onClick={() => { setSearch(''); setMarketType('all'); setSignalFilter('all'); setMinVolume(''); setMinOI(''); }}>Reset</Btn>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:isError?C.red:isFetching?C.amber:C.green, boxShadow:`0 0 5px ${isError?C.red:isFetching?C.amber:C.green}` }} />
          <span style={{ fontSize:9, color:C.dim }}>{isError?'ERROR':isFetching?'FETCHING':liveUpdates?'LIVE':'PAUSED'}</span>
        </div>
      </div>

      {/* ── FILTER BAR (UNCHANGED) ───────────────────────────────────── */}
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

      {/* ── SUMMARY STRIP ──────────────────────────────────────────────── */}
      <div style={{ background:'#07101a', borderBottom:`1px solid ${C.border}`, padding:'5px 12px', display:'flex', gap:7, overflowX:'auto', flexShrink:0, scrollbarWidth:'none', alignItems:'stretch' }}>
        {isLoading
          ? Array.from({length:9}).map((_,i) => <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:'5px 11px', flexShrink:0, minWidth:96, height:40, opacity:0.3 }} />)
          : summaryItems.map(item => (
              <SummaryChip key={item.id} label={item.label} coin={item.coin} value={item.value} color={item.color}
                selected={!!item.coin && selectedCoin===item.coin}
                onClick={item.coin ? () => setSelectedCoin(item.coin!) : undefined} />
            ))
        }
      </div>

      {/* ── SCROLLABLE MAIN CONTENT ───────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>

        {/* Loading / error */}
        {isLoading && (
          <div style={{ padding:40, textAlign:'center', color:C.dim, fontSize:11 }}>
            <div style={{ width:22, height:22, border:`2px solid ${C.border}`, borderTopColor:C.teal, borderRadius:'50%', animation:'spin 0.9s linear infinite', margin:'0 auto 10px' }} />
            Loading Hyperliquid signal snapshot…
          </div>
        )}
        {isError && !isLoading && (
          <div style={{ padding:32, textAlign:'center' }}>
            <AlertTriangle style={{ width:22, height:22, color:C.amber, marginBottom:8 }} />
            <div style={{ fontSize:11, color:C.amber, marginBottom:5 }}>Failed to load screener data</div>
            <div style={{ fontSize:9.5, color:C.dim, marginBottom:10 }}>{(error as any)?.message}</div>
            <button onClick={() => refetch()} style={{ background:C.teal, color:'#fff', border:'none', borderRadius:4, padding:'5px 14px', fontSize:10, cursor:'pointer' }}>Retry</button>
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── HERO: AGENT TOP SIGNALS ───────────────────────────────── */}
            <HeroSection
              agentResult={agentResult} agentLoading={agentLoading} agentStage={agentStage}
              rows={sorted} selectedCoin={selectedCoin}
              onSelect={coin => setSelectedCoin(coin)} onRunAgent={runAgent} />

            {/* ── SIGNAL BOARDS ────────────────────────────────────────── */}
            {sorted.length > 0 && (
              <div style={{ padding:'12px 14px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:10 }}>
                {signalSections.map(sec => (
                  <SignalBoard key={sec.id} section={sec} selectedCoin={selectedCoin}
                    onSelect={coin => setSelectedCoin(coin)} />
                ))}
              </div>
            )}

            {/* ── MARKET MATRIX (collapsible) ──────────────────────────── */}
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
                                  {isSorted ? (sortDir==='asc'?<ChevronUp style={{ width:8, height:8, color:C.teal }} />:<ChevronDown style={{ width:8, height:8, color:C.teal }} />) : <ChevronsUpDown style={{ width:8, height:8, color:C.dimLow }} />}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((row, idx) => {
                          const isSel = selectedCoin === row.coin;
                          const isPinned = pinnedCoins.has(row.coin);
                          const isHi = rowHighlights.has(row.coin);
                          const rowBg = isSel?`${C.teal}18`:isPinned?`${C.amber}0c`:isHi?`${C.purple}18`:idx%2===0?C.bg:C.card2;
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
                                const v = row[col.key]; const txt = col.fmt(v); const clr = col.vc ? col.vc(v) : C.text;
                                return (
                                  <td key={col.key} style={{ padding:'0 7px', textAlign:col.align??'right', fontFamily:C.font, fontSize:density==='compact'?9:10, color:col.key==='coin'?C.text:clr, fontWeight:col.key==='coin'?700:400, whiteSpace:'nowrap', position:col.key==='coin'?'sticky':'static', left:col.key==='coin'?38:'auto', background:col.key==='coin'?rowBg:'transparent', zIndex:col.key==='coin'?2:'auto', borderRight:`1px solid ${C.dimLow}` }}>
                                    {col.key==='coin'
                                      ? <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>{isPinned&&<span style={{ color:C.amber, fontSize:8 }}>●</span>}{txt}</span>
                                      : txt
                                    }
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
