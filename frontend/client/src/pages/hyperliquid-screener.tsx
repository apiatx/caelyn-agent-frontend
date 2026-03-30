import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Search, RefreshCw, Bot, X, ChevronDown, ChevronUp,
  ChevronsUpDown, AlertTriangle, Pin, ArrowUpRight, ArrowDownRight,
  Minus, Filter, Settings2, TrendingUp, TrendingDown, BarChart2,
  Layers, Zap, Eye, EyeOff, ChevronRight,
} from 'lucide-react';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:      '#080c13',
  card:    '#0d1623',
  card2:   '#0a1020',
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
  font:    "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
};

// ─── Types ─────────────────────────────────────────────────────────────────────
// Backend contract: GET /api/hyperliquid/screener → { rows: ScreenerRow[], meta: ScreenerMeta,
//   signalSections?: SignalSection[], summaryCards?: SummaryCard[] }
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
  spreadBps:         number | null;
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

// Backend-provided summary card (optional — frontend derives from rows if absent)
export interface SummaryCard {
  id:        string;
  label:     string;
  coin:      string | null;
  value:     string;
  sub?:      string | null;
  direction: 'up' | 'down' | 'neutral';
  color?:    string;
}

// Backend-provided signal section (optional — frontend derives from rows if absent)
export interface SignalSection {
  id:       string;
  title:    string;
  subtitle: string;
  color:    string;
  items:    SignalSectionItem[];
}
export interface SignalSectionItem {
  coin:       string;
  primary:    string;
  secondary?: string;
  direction:  'up' | 'down' | 'neutral';
  delta?:     string;
}

// Backend contract: POST /api/hyperliquid/agent-rank → AgentResult
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
  coin:        string;
  agentRank:   number;
  agentScore:  number;
  direction:   'long' | 'short' | 'avoid' | 'neutral';
  confidence:  number;
  rationale:   string;
  rankMovement?: number;
  featureContributions?: Record<string, number>;
}

// Backend contract: GET /api/hyperliquid/asset/:coin → AssetDetail
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

// ─── Column Definitions (for matrix table) ────────────────────────────────────
type ColKey = keyof ScreenerRow;
interface ColDef {
  key: ColKey; label: string; width: number;
  fmt: (v: any) => string;
  color?: (v: any, row: ScreenerRow) => string;
  align?: 'left' | 'right';
  basic?: boolean;
  advanced?: boolean;
}

const pct = (v: number | null, dec = 2) =>
  v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(dec)}%`;
const $$ = (v: number | null) =>
  v == null ? '—' : v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` : `$${v.toFixed(2)}`;
const px = (v: number | null) =>
  v == null ? '—' : v >= 1000 ? v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : v >= 1 ? v.toFixed(3) : v.toFixed(6);
const sc = (v: number | null) => v == null ? '—' : v.toFixed(2);
const nn = (v: number | null) => v == null ? '—' : v.toLocaleString();
const pctClr  = (v: number | null) => v == null ? C.dim : v > 0 ? C.green : v < 0 ? C.red : C.dim;
const scoreClr = (v: number | null) => v == null ? C.dim : v >= 0.6 ? C.green : v <= 0.35 ? C.red : C.amber;
const fundClr  = (v: number | null) => v == null ? C.dim : v > 0.01 ? C.green : v < -0.01 ? C.red : C.dim;
const fmtFund  = (v: number | null) => v == null ? '—' : `${(v*100).toFixed(4)}%`;
const fmtDist  = (v: number | null) => v == null ? '—' : pct(v*100, 4);

const COLUMNS: ColDef[] = [
  { key:'rank',             label:'#',      width:44,  fmt: v => v ?? '—',              align:'right', basic:true },
  { key:'coin',             label:'COIN',   width:90,  fmt: v => v ?? '—',              align:'left',  basic:true },
  { key:'marketType',       label:'MKT',    width:52,  fmt: v => v?.toUpperCase() ?? '—',align:'left', basic:true },
  { key:'markPrice',        label:'MARK',   width:110, fmt: px,                          align:'right', basic:true },
  { key:'change24hPct',     label:'24H%',   width:76,  fmt: pct,    color: pctClr,       align:'right', basic:true },
  { key:'funding',          label:'FUND%',  width:80,  fmt: fmtFund,color: fundClr,      align:'right', basic:true },
  { key:'openInterest',     label:'OI',     width:100, fmt: $$,                          align:'right', basic:true },
  { key:'oiChangePct',      label:'OI Δ%',  width:76,  fmt: pct,    color: pctClr,       align:'right', basic:true },
  { key:'volume24h',        label:'VOL24H', width:100, fmt: $$,                          align:'right', basic:true },
  { key:'volumeImpulse',    label:'VOL-IMP',width:80,  fmt: sc,     color: scoreClr,     align:'right', basic:true },
  { key:'distMarkOracle',   label:'MK-ORC%',width:80,  fmt: fmtDist,color: pctClr,      align:'right', basic:true },
  { key:'distMarkMid',      label:'MK-MID%',width:80,  fmt: fmtDist,color: pctClr,      align:'right' },
  { key:'spreadBps',        label:'SPR-BPS',width:76,  fmt: v => v == null ? '—' : `${v.toFixed(1)}bp`, align:'right', basic:true },
  { key:'bidDepth',         label:'B-DEPTH',width:100, fmt: $$, color: () => C.green,   align:'right' },
  { key:'askDepth',         label:'A-DEPTH',width:100, fmt: $$, color: () => C.red,     align:'right' },
  { key:'bidAskImbalance',  label:'BK-IMBL',width:76,  fmt: v => v == null ? '—' : v.toFixed(3), color: pctClr, align:'right' },
  { key:'tradeImbalance',   label:'TR-IMBL',width:76,  fmt: v => v == null ? '—' : v.toFixed(3), color: pctClr, align:'right' },
  { key:'volatility',       label:'VOL-SCR',width:76,  fmt: sc, color: scoreClr,        align:'right' },
  { key:'breakoutScore',    label:'BRK-SCR',width:76,  fmt: sc, color: scoreClr,        align:'right' },
  { key:'meanReversionScore',label:'MR-SCR',width:76,  fmt: sc, color: scoreClr,        align:'right' },
  { key:'compositeSignal',  label:'SIGNAL', width:76,  fmt: sc, color: scoreClr,        align:'right', basic:true },
  { key:'agentScore',       label:'A-SCORE',width:80,  fmt: sc, color: scoreClr,        align:'right', basic:true },
  { key:'agentRank',        label:'A-RANK', width:72,  fmt: v => v ?? '—',             align:'right', basic:true },
  { key:'rankDelta',        label:'Δ RANK', width:72,  fmt: v => v == null ? '—' : v > 0 ? `▲${v}` : v < 0 ? `▼${Math.abs(v)}` : '—', color: (v) => v > 0 ? C.green : v < 0 ? C.red : C.dim, align:'right', basic:true },
  { key:'maxLeverage',      label:'MAXLEV', width:72,  fmt: v => v == null ? '—' : `${v}x`, align:'right', advanced:true },
  { key:'marketStatus',     label:'STATUS', width:84,  fmt: v => v ?? '—',             align:'left',  advanced:true },
  { key:'updatedAt',        label:'UPDT',   width:80,  fmt: v => v ? new Date(v).toLocaleTimeString() : '—', align:'right' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const dirIcon = (dir: string | null) =>
  dir === 'bullish' ? <ArrowUpRight style={{ width:10, height:10, color:C.green, display:'inline' }} /> :
  dir === 'bearish' ? <ArrowDownRight style={{ width:10, height:10, color:C.red, display:'inline' }} /> :
  <Minus style={{ width:10, height:10, color:C.dim, display:'inline' }} />;

const topN = (arr: ScreenerRow[], key: keyof ScreenerRow, n = 6, asc = false) =>
  [...arr].filter(r => r[key] != null).sort((a, b) => {
    const av = a[key] as number, bv = b[key] as number;
    return asc ? av - bv : bv - av;
  }).slice(0, n);

const topNAbs = (arr: ScreenerRow[], key: keyof ScreenerRow, n = 6) =>
  [...arr].filter(r => r[key] != null).sort((a, b) => Math.abs(b[key] as number) - Math.abs(a[key] as number)).slice(0, n);

// ─── Signal Section Derivation ────────────────────────────────────────────────
interface DerivedSection {
  id: string; title: string; subtitle: string; color: string;
  items: { coin: string; primary: string; secondary?: string; direction: 'up' | 'down' | 'neutral' }[];
}

function deriveSignalSections(rows: ScreenerRow[], agentResult: AgentResult | null): DerivedSection[] {
  const mk = (
    id: string, title: string, subtitle: string, color: string,
    src: ScreenerRow[], primFn: (r: ScreenerRow) => string,
    secFn?: (r: ScreenerRow) => string,
    dirFn?: (r: ScreenerRow) => 'up' | 'down' | 'neutral',
  ): DerivedSection => ({
    id, title, subtitle, color,
    items: src.map(r => ({
      coin: r.coin,
      primary: primFn(r),
      secondary: secFn ? secFn(r) : undefined,
      direction: dirFn ? dirFn(r) : 'neutral',
    })),
  });

  const oi_up   = topN(rows, 'oiChangePct', 6);
  const oi_dn   = topN(rows, 'oiChangePct', 6, true);
  const vol_top  = topN(rows, 'volume24h', 6);
  const gain_top = topN(rows, 'change24hPct', 6);
  const lose_top = topN(rows, 'change24hPct', 6, true);
  const fund_hi  = topN(rows, 'funding', 6);
  const fund_lo  = topN(rows, 'funding', 6, true);
  const disloc   = topNAbs(rows, 'distMarkOracle', 6);
  const prem     = topNAbs(rows, 'premium', 6);
  const bk_imbl  = topNAbs(rows, 'bidAskImbalance', 6);
  const tr_imbl  = topNAbs(rows, 'tradeImbalance', 6);
  const volscore = topN(rows, 'volatility', 6);
  const brk      = topN(rows, 'breakoutScore', 6);
  const mr       = topN(rows, 'meanReversionScore', 6);
  const sq_watch = rows.filter(r => (r.funding ?? 0) > 0.02 && r.signalDirection === 'bearish').sort((a,b) => (b.funding ?? 0) - (a.funding ?? 0)).slice(0,6);
  const liq_watch= rows.filter(r => (r.funding ?? 0) < -0.02 && r.signalDirection === 'bullish').sort((a,b) => (a.funding ?? 0) - (b.funding ?? 0)).slice(0,6);
  const cr_longs = rows.filter(r => r.signalDirection === 'bullish').sort((a,b) => (b.compositeSignal ?? 0) - (a.compositeSignal ?? 0)).slice(0,6);
  const cr_shorts= rows.filter(r => r.signalDirection === 'bearish').sort((a,b) => (a.compositeSignal ?? 1) - (b.compositeSignal ?? 1)).slice(0,6);
  const illiq    = topN(rows, 'liquidityScore', 6, true).filter(r => (r.liquidityScore ?? 1) < 0.4);

  const up  = () => 'up'   as const;
  const dn  = () => 'down' as const;
  const auto= (r: ScreenerRow) => (r.change24hPct ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const fund_d = (r: ScreenerRow) => (r.funding ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const dist_d = (r: ScreenerRow) => (r.distMarkOracle ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const prem_d = (r: ScreenerRow) => (r.premium ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const imbl_d = (r: ScreenerRow) => (r.bidAskImbalance ?? 0) >= 0 ? 'up' as const : 'down' as const;
  const tr_d   = (r: ScreenerRow) => (r.tradeImbalance ?? 0) >= 0 ? 'up' as const : 'down' as const;

  const sections: DerivedSection[] = [
    mk('oi-expand',  'OI Expansion',      'Largest open interest build', C.amber,
       oi_up,   r => pct(r.oiChangePct),  r => $$(r.openInterest), up),
    mk('oi-unwind',  'OI Unwind',         'Largest OI liquidation',      C.red,
       oi_dn,   r => pct(r.oiChangePct),  r => $$(r.openInterest), dn),
    mk('vol-impulse','Volume Leaders',    'Largest 24h notional volume', C.teal,
       vol_top, r => $$(r.volume24h),      r => $$(r.openInterest), auto),
    mk('gainers',    'Top Gainers',       'Strongest 24h price movers',  C.green,
       gain_top,r => pct(r.change24hPct), r => px(r.markPrice),    up),
    mk('losers',     'Top Losers',        'Sharpest 24h price declines', C.red,
       lose_top,r => pct(r.change24hPct), r => px(r.markPrice),    dn),
    mk('fund-hi',    'High Funding',      'Longs paying — squeeze watch',C.green,
       fund_hi, r => fmtFund(r.funding),  r => $$(r.openInterest), fund_d),
    mk('fund-lo',    'Negative Funding',  'Shorts paying — flush watch', C.blue,
       fund_lo, r => fmtFund(r.funding),  r => $$(r.openInterest), fund_d),
    mk('disloc',     'Mark/Oracle Gap',   'Largest mark vs oracle delta', C.amber,
       disloc,  r => fmtDist(r.distMarkOracle), r => px(r.markPrice), dist_d),
    mk('premium',    'Premium/Discount',  'Mark vs mid price dislocation',C.cyan,
       prem,    r => fmtDist(r.premium),  r => fmtFund(r.funding), prem_d),
    mk('book-imbl',  'Book Imbalance',    'Order book bid/ask skew',     C.purple,
       bk_imbl, r => r.bidAskImbalance == null ? '—' : r.bidAskImbalance.toFixed(3), r => $$(r.bidDepth), imbl_d),
    mk('trade-imbl', 'Trade Flow',        'Buy vs sell trade pressure',  C.teal,
       tr_imbl, r => r.tradeImbalance == null ? '—' : r.tradeImbalance.toFixed(3), r => nn(r.tradeCount), tr_d),
    mk('volatility', 'Volatility Leaders','Highest realized vol score',  C.amber,
       volscore,r => sc(r.volatility),    r => pct(r.change24hPct), auto),
    mk('breakout',   'Breakout Watch',    'High breakout probability',   C.green,
       brk,     r => sc(r.breakoutScore), r => pct(r.change24hPct), up),
    mk('mean-rev',   'Mean Reversion',    'Stretched vs mean — reversal',C.blue,
       mr,      r => sc(r.meanReversionScore), r => fmtDist(r.distMarkOracle), dn),
    mk('short-sqz',  'Short Squeeze',     'High funding + bearish OI',   C.red,
       sq_watch,r => fmtFund(r.funding),  r => pct(r.oiChangePct), up),
    mk('long-liq',   'Long Flush Watch',  'Negative funding + bull OI',  C.red,
       liq_watch,r => fmtFund(r.funding), r => pct(r.oiChangePct), dn),
    mk('crowd-long', 'Crowded Longs',     'High signal + bullish crowd', C.amber,
       cr_longs,r => sc(r.compositeSignal), r => $$(r.openInterest), up),
    mk('crowd-short','Crowded Shorts',    'Low signal + bearish crowd',  C.purple,
       cr_shorts,r => sc(r.compositeSignal), r => $$(r.openInterest), dn),
    {
      id: 'illiquid', title: 'Illiquid Zone', subtitle: 'Low liquidity — dangerous OI',
      color: C.red,
      items: illiq.map(r => ({
        coin: r.coin, primary: sc(r.liquidityScore),
        secondary: $$(r.openInterest), direction: 'down' as const,
      })),
    },
    {
      id: 'agent-signals', title: 'Agent Top Signals', subtitle: 'AI-ranked top opportunities',
      color: C.purple,
      items: agentResult
        ? agentResult.rankedCoins.slice(0,6).map(a => ({
            coin: a.coin, primary: a.agentScore.toFixed(2),
            secondary: a.direction,
            direction: (a.direction === 'long' ? 'up' : a.direction === 'short' ? 'down' : 'neutral') as 'up'|'down'|'neutral',
          }))
        : [],
    },
  ];
  return sections;
}

// ─── Summary Strip Item ───────────────────────────────────────────────────────
function SummaryChip({ label, coin, value, sub, color, selected, onClick }: {
  label: string; coin?: string | null; value: string; sub?: string | null;
  color?: string; selected?: boolean; onClick?: () => void;
}) {
  const col = color ?? C.teal;
  return (
    <div onClick={onClick} style={{
      background: selected ? `${col}1a` : C.card, border: `1px solid ${selected ? col : C.border}`,
      borderRadius: 5, padding: '5px 11px', flexShrink: 0, cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s', minWidth: 100,
    }}>
      <div style={{ fontSize: 7.5, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: col, fontFamily: C.font, lineHeight: 1 }}>
        {coin && <span style={{ marginRight: 4 }}>{coin}</span>}
        {value}
      </div>
      {sub && <div style={{ fontSize: 8.5, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Signal Board Card ────────────────────────────────────────────────────────
function SignalBoard({ section, selectedCoin, onSelect }: {
  section: DerivedSection; selectedCoin: string | null; onSelect: (coin: string) => void;
}) {
  const empty = section.items.length === 0;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, borderTop: `2px solid ${section.color}`, display: 'flex', flexDirection: 'column', minHeight: 180, overflow: 'hidden' }}>
      <div style={{ padding: '7px 10px 5px', borderBottom: `1px solid ${C.dimLow}`, flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: section.color, textTransform: 'uppercase' }}>{section.title}</div>
        <div style={{ fontSize: 8, color: C.dim, marginTop: 2 }}>{section.subtitle}</div>
      </div>
      {empty ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, color: C.dimLow, padding: 12, textAlign: 'center' }}>
          Awaiting signal snapshot
        </div>
      ) : (
        <div>
          {section.items.map((item, i) => {
            const sel = selectedCoin === item.coin;
            const dirC = item.direction === 'up' ? C.green : item.direction === 'down' ? C.red : C.dim;
            return (
              <div key={item.coin} onClick={() => onSelect(item.coin)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                  cursor: 'pointer', transition: 'background 0.1s',
                  background: sel ? `${section.color}15` : 'transparent',
                  borderBottom: i < section.items.length - 1 ? `1px solid ${C.dimLow}` : 'none',
                }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = `${section.color}09`; }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <span style={{ fontSize: 8, color: C.dimLow, fontFamily: C.font, minWidth: 12, textAlign: 'right', flexShrink: 0 }}>{i+1}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: sel ? section.color : C.text, fontFamily: C.font, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.coin}</span>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: dirC, fontFamily: C.font, flexShrink: 0 }}>{item.primary}</span>
                {item.secondary && <span style={{ fontSize: 8, color: C.dim, flexShrink: 0 }}>{item.secondary}</span>}
                <span style={{ fontSize: 8, color: dirC, flexShrink: 0 }}>
                  {item.direction === 'up' ? '▲' : item.direction === 'down' ? '▼' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ row, detail, onClose }: { row: ScreenerRow; detail: AssetDetail | null; onClose: () => void }) {
  const col = row.signalDirection === 'bullish' ? C.green : row.signalDirection === 'bearish' ? C.red : C.teal;
  const R = ({ label, value, vc }: { label: string; value: string; vc?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid ${C.dimLow}` }}>
      <span style={{ fontSize: 9, color: C.dim }}>{label}</span>
      <span style={{ fontSize: 9, fontFamily: C.font, fontWeight: 600, color: vc ?? C.text }}>{value}</span>
    </div>
  );
  const Sec = ({ t, c }: { t: string; c?: string }) => (
    <div style={{ fontSize: 7.5, color: c ?? C.teal, letterSpacing: 2, marginTop: 12, marginBottom: 5, textTransform: 'uppercase', fontWeight: 800 }}>{t}</div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: C.card2, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, boxShadow: `0 0 6px ${col}`, flexShrink: 0 }} />
        <span style={{ fontFamily: C.font, fontWeight: 800, fontSize: 13, color: C.text }}>{row.coin}</span>
        <span style={{ fontSize: 8.5, color: C.dim, background: C.dimLow, borderRadius: 3, padding: '1px 5px' }}>{row.marketType?.toUpperCase()}</span>
        <span style={{ fontSize: 8.5, fontWeight: 700, color: col, background: `${col}18`, border: `1px solid ${col}33`, borderRadius: 3, padding: '1px 5px' }}>
          {row.signalDirection?.toUpperCase() ?? '—'}
        </span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.dim }}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        <Sec t="Price" />
        <R label="Mark"       value={px(row.markPrice)} />
        <R label="Oracle"     value={px(row.oraclePrice)} />
        <R label="Mid"        value={px(row.midPrice)} />
        <R label="24H Chg"    value={pct(row.change24hPct)} vc={pctClr(row.change24hPct)} />
        <R label="Mk-Oracle"  value={fmtDist(row.distMarkOracle)} vc={pctClr(row.distMarkOracle)} />
        <R label="Mk-Mid"     value={fmtDist(row.distMarkMid)} vc={pctClr(row.distMarkMid)} />
        <Sec t="Funding / OI" />
        <R label="Funding"    value={fmtFund(row.funding)} vc={fundClr(row.funding)} />
        <R label="Pred Fund"  value={fmtFund(row.predictedFunding)} vc={fundClr(row.predictedFunding)} />
        <R label="OI"         value={$$(row.openInterest)} />
        <R label="OI Δ%"      value={pct(row.oiChangePct)} vc={pctClr(row.oiChangePct)} />
        <Sec t="Volume" />
        <R label="24H Vol"    value={$$(row.volume24h)} />
        <R label="Vol Impulse"value={sc(row.volumeImpulse)} vc={scoreClr(row.volumeImpulse)} />
        <R label="Trade Cnt"  value={nn(row.tradeCount)} />
        <R label="Trade Imbl" value={row.tradeImbalance == null ? '—' : row.tradeImbalance.toFixed(3)} vc={pctClr(row.tradeImbalance)} />
        <Sec t="Order Book" />
        <R label="Bid Depth"  value={$$(row.bidDepth)}  vc={C.green} />
        <R label="Ask Depth"  value={$$(row.askDepth)}  vc={C.red} />
        <R label="Book Imbl"  value={row.bidAskImbalance == null ? '—' : row.bidAskImbalance.toFixed(3)} vc={pctClr(row.bidAskImbalance)} />
        <R label="Spread bps" value={row.spreadBps == null ? '—' : `${row.spreadBps.toFixed(1)} bp`} />
        <Sec t="Scores" />
        <R label="Composite"  value={sc(row.compositeSignal)}    vc={scoreClr(row.compositeSignal)} />
        <R label="Confidence" value={row.signalConfidence == null ? '—' : `${(row.signalConfidence*100).toFixed(0)}%`} vc={scoreClr(row.signalConfidence)} />
        <R label="Volatility" value={sc(row.volatility)}         vc={scoreClr(row.volatility)} />
        <R label="Momentum"   value={sc(row.momentum)}           vc={scoreClr(row.momentum)} />
        <R label="Breakout"   value={sc(row.breakoutScore)}      vc={scoreClr(row.breakoutScore)} />
        <R label="Mean-Rev"   value={sc(row.meanReversionScore)} vc={scoreClr(row.meanReversionScore)} />
        <R label="Liquidity"  value={sc(row.liquidityScore)}     vc={scoreClr(row.liquidityScore)} />
        <R label="Flow"       value={sc(row.flowScore)}          vc={scoreClr(row.flowScore)} />
        {row.agentRationale && <>
          <Sec t="Agent Commentary" c={C.purple} />
          <div style={{ fontSize: 8.5, color: C.text, lineHeight: 1.6, background: `${C.purple}0d`, border: `1px solid ${C.purple}33`, borderRadius: 4, padding: '7px 9px' }}>
            {row.agentRationale}
          </div>
        </>}
        {detail?.marketStructure && <>
          <Sec t="Market Structure" c={C.amber} />
          <div style={{ fontSize: 8.5, color: C.text, lineHeight: 1.6, background: C.dimLow, borderRadius: 4, padding: '7px 9px' }}>
            {detail.marketStructure}
          </div>
        </>}
        {detail?.momentumSummary && <>
          <Sec t="Momentum" c={C.amber} />
          <div style={{ fontSize: 8.5, color: C.text, lineHeight: 1.6, background: C.dimLow, borderRadius: 4, padding: '7px 9px' }}>
            {detail.momentumSummary}
          </div>
        </>}
        <div style={{ marginTop: 10, fontSize: 8, color: C.dim }}>
          Updated {row.updatedAt ? new Date(row.updatedAt).toLocaleTimeString() : '—'}
          {row.maxLeverage != null && <span style={{ marginLeft: 10 }}>Max lev: {row.maxLeverage}×</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Agent Panel ──────────────────────────────────────────────────────────────
function AgentPanel({ result, onJump, onClose }: { result: AgentResult; onJump: (coin: string) => void; onClose: () => void }) {
  const Bucket = ({ title, items, color }: { title: string; items: AgentRankedItem[]; color: string }) =>
    items.length > 0 ? (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 7.5, color, letterSpacing: 2, marginBottom: 5, textTransform: 'uppercase', fontWeight: 800 }}>{title}</div>
        {items.map((item, i) => (
          <div key={item.coin} onClick={() => onJump(item.coin)}
            style={{ display: 'flex', gap: 7, padding: '4px 8px', marginBottom: 2, background: C.dimLow, borderRadius: 4, cursor: 'pointer', border: `1px solid ${color}22`, alignItems: 'flex-start', transition: 'border-color 0.12s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${color}55`}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = `${color}22`}>
            <span style={{ fontSize: 9, color, fontWeight: 800, fontFamily: C.font, flexShrink: 0, minWidth: 18 }}>#{item.agentRank}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.text, fontFamily: C.font, flexShrink: 0, minWidth: 48 }}>{item.coin}</span>
            <span style={{ fontSize: 8, color: C.dim, lineHeight: 1.5, flex: 1 }}>{item.rationale}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color, fontFamily: C.font }}>{item.agentScore.toFixed(2)}</span>
              {item.rankMovement != null && (
                <span style={{ fontSize: 7.5, color: item.rankMovement > 0 ? C.green : C.red }}>
                  {item.rankMovement > 0 ? `▲${item.rankMovement}` : `▼${Math.abs(item.rankMovement)}`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: C.card2, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
        <Bot style={{ width: 13, height: 13, color: C.purple }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: C.text, letterSpacing: 0.5 }}>AGENT SIGNALS</span>
        <span style={{ fontSize: 8, color: C.dim }}>{new Date(result.generatedAt).toLocaleTimeString()}</span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.dim }}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {result.summary && (
          <div style={{ fontSize: 8.5, color: C.text, lineHeight: 1.6, background: `${C.purple}0d`, border: `1px solid ${C.purple}33`, borderRadius: 4, padding: '7px 9px', marginBottom: 12 }}>
            {result.summary}
          </div>
        )}
        <Bucket title="Top Longs"       items={result.longs}          color={C.green} />
        <Bucket title="Top Shorts"      items={result.shorts}         color={C.red} />
        <Bucket title="Breakouts"       items={result.breakouts ?? []}color={C.teal} />
        <Bucket title="Mean Reversions" items={result.meanReversions ?? []} color={C.blue} />
        <Bucket title="Avoid"           items={result.avoid}          color={C.amber} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HyperliquidScreenerPage() {
  // ── UI State ──
  const [search,        setSearch]        = useState('');
  const [marketType,    setMarketType]    = useState<'all'|'perp'|'spot'>('all');
  const [minVolume,     setMinVolume]     = useState('');
  const [minOI,         setMinOI]         = useState('');
  const [signalFilter,  setSignalFilter]  = useState<'all'|'bullish'|'bearish'>('all');
  const [sortKey,       setSortKey]       = useState<ColKey>('rank');
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
  const [activePanel,   setActivePanel]   = useState<'detail'|'agent'>('detail');
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Fetch snapshot ──
  const { data: raw, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery<
    { rows: ScreenerRow[]; meta: ScreenerMeta; signalSections?: SignalSection[]; summaryCards?: SummaryCard[] }
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

  // ── Fetch asset detail ──
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

  // ── Merge agent results into rows ──
  const rows: ScreenerRow[] = useMemo(() => {
    const base = raw?.rows ?? [];
    if (!agentResult) return base;
    const agentMap = new Map(agentResult.rankedCoins.map(a => [a.coin, a]));
    return base.map(row => {
      const ag = agentMap.get(row.coin);
      if (!ag) return row;
      return { ...row, agentRank: ag.agentRank, agentScore: ag.agentScore, agentRationale: ag.rationale, rankDelta: row.rank - ag.agentRank };
    });
  }, [raw, agentResult]);

  // ── Filter ──
  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) { const q = search.trim().toLowerCase(); r = r.filter(row => row.coin.toLowerCase().includes(q) || (row.displayName ?? '').toLowerCase().includes(q)); }
    if (marketType !== 'all') r = r.filter(row => row.marketType === marketType);
    if (minVolume) r = r.filter(row => (row.volume24h ?? 0) >= parseFloat(minVolume) * 1e6);
    if (minOI)     r = r.filter(row => (row.openInterest ?? 0) >= parseFloat(minOI) * 1e6);
    if (signalFilter !== 'all') r = r.filter(row => row.signalDirection === signalFilter);
    return r;
  }, [rows, search, marketType, minVolume, minOI, signalFilter]);

  // ── Sort ──
  const sorted = useMemo(() => {
    const pinned = filtered.filter(r => pinnedCoins.has(r.coin));
    const rest   = filtered.filter(r => !pinnedCoins.has(r.coin));
    const cmp = (a: ScreenerRow, b: ScreenerRow) => {
      const av = a[sortKey] as any, bv = b[sortKey] as any;
      if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1;
      const d = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? d : -d;
    };
    return [...pinned, ...rest.sort(cmp)];
  }, [filtered, sortKey, sortDir, pinnedCoins]);

  // ── Derive signal sections (uses backend-provided if available, else derives from rows) ──
  const signalSections: DerivedSection[] = useMemo(() =>
    raw?.signalSections ?? deriveSignalSections(sorted, agentResult),
  [raw, sorted, agentResult]);

  // ── Derive summary strip ──
  const summaryItems = useMemo(() => {
    const meta = raw?.meta;
    if (raw?.summaryCards) return raw.summaryCards;
    if (!rows.length && !meta) return [];
    const top   = (key: keyof ScreenerRow, asc = false) => [...rows].filter(r => r[key] != null).sort((a,b) => asc ? (a[key] as number) - (b[key] as number) : (b[key] as number) - (a[key] as number))[0];
    const topAbs = (key: keyof ScreenerRow) => [...rows].filter(r => r[key] != null).sort((a,b) => Math.abs(b[key] as number) - Math.abs(a[key] as number))[0];
    const g24  = top('change24hPct');
    const l24  = top('change24hPct', true);
    const oiUp = top('oiChangePct');
    const oiDn = top('oiChangePct', true);
    const fHi  = top('funding');
    const fLo  = top('funding', true);
    const dis  = topAbs('distMarkOracle');
    const vol  = top('volume24h');
    const bki  = topAbs('bidAskImbalance');
    const agentTop = agentResult?.longs[0];
    return [
      { id:'g24',   label:'Top Gainer',     coin:g24?.coin,   value:g24   ? pct(g24.change24hPct)                  : '—', direction:'up'      as const, color:C.green  },
      { id:'l24',   label:'Top Loser',      coin:l24?.coin,   value:l24   ? pct(l24.change24hPct)                  : '—', direction:'down'    as const, color:C.red    },
      { id:'oiup',  label:'OI Expansion',   coin:oiUp?.coin,  value:oiUp  ? pct(oiUp.oiChangePct)                  : '—', direction:'up'      as const, color:C.amber  },
      { id:'oidn',  label:'OI Unwind',      coin:oiDn?.coin,  value:oiDn  ? pct(oiDn.oiChangePct)                  : '—', direction:'down'    as const, color:C.red    },
      { id:'fhi',   label:'High Funding',   coin:fHi?.coin,   value:fHi   ? fmtFund(fHi.funding)                   : '—', direction:'up'      as const, color:C.green  },
      { id:'flo',   label:'Neg Funding',    coin:fLo?.coin,   value:fLo   ? fmtFund(fLo.funding)                   : '—', direction:'down'    as const, color:C.blue   },
      { id:'dis',   label:'Mk/Oracle Gap',  coin:dis?.coin,   value:dis   ? fmtDist(dis.distMarkOracle)            : '—', direction:'neutral' as const, color:C.amber  },
      { id:'vol',   label:'Vol Impulse',    coin:vol?.coin,   value:vol   ? $$(vol.volume24h)                       : '—', direction:'up'      as const, color:C.teal   },
      { id:'bki',   label:'Book Imbalance', coin:bki?.coin,   value:bki   ? (bki.bidAskImbalance!).toFixed(3)       : '—', direction:'neutral' as const, color:C.purple },
      { id:'ag',    label:'Agent Signal',   coin:agentTop?.coin, value:agentTop ? agentTop.agentScore.toFixed(2)  : '—', direction:'up'      as const, color:C.purple },
      { id:'ts',    label:'Last Update',    coin:null,        value: meta?.lastUpdated ? new Date(meta.lastUpdated).toLocaleTimeString() : dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—', direction:'neutral' as const, color:C.dim },
    ];
  }, [raw, rows, agentResult, dataUpdatedAt]);

  // ── Sort click ──
  const handleSort = useCallback((key: ColKey) => {
    setSortKey(prev => { if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; } setSortDir('asc'); return key; });
  }, []);

  // ── Agent run ──
  const runAgent = useCallback(async () => {
    setAgentLoading(true); setAgentError(null); setAgentStage('Sending to agent…');
    try {
      const payload = { rows: sorted.slice(0, 100).map(r => ({ coin:r.coin, markPrice:r.markPrice, change24hPct:r.change24hPct, funding:r.funding, premium:r.premium, openInterest:r.openInterest, oiChangePct:r.oiChangePct, volume24h:r.volume24h, volumeImpulse:r.volumeImpulse, compositeSignal:r.compositeSignal, signalDirection:r.signalDirection, signalConfidence:r.signalConfidence, momentum:r.momentum, breakoutScore:r.breakoutScore, meanReversionScore:r.meanReversionScore, liquidityScore:r.liquidityScore, flowScore:r.flowScore, volatility:r.volatility, bidAskImbalance:r.bidAskImbalance, tradeImbalance:r.tradeImbalance, distMarkOracle:r.distMarkOracle })) };
      setAgentStage('Agent analyzing…');
      const res = await fetch('/api/hyperliquid/agent-rank', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Agent returned ${res.status}`);
      const data: AgentResult = await res.json();
      setAgentResult(data);
      setActivePanel('agent');
      const highlights = new Set(data.rankedCoins.filter(r => Math.abs(r.agentRank - (rows.find(x => x.coin === r.coin)?.rank ?? r.agentRank)) >= 3).map(r => r.coin));
      setRowHighlights(highlights);
      setTimeout(() => setRowHighlights(new Set()), 4000);
      if (autoRerank) setSortKey('agentRank');
    } catch (e: any) { setAgentError(e.message ?? 'Agent failed'); }
    finally { setAgentLoading(false); setAgentStage(''); }
  }, [sorted, rows, autoRerank]);

  const togglePin = useCallback((coin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedCoins(prev => { const s = new Set(prev); s.has(coin) ? s.delete(coin) : s.add(coin); return s; });
  }, []);

  const jumpToCoin = useCallback((coin: string) => {
    setSelectedCoin(coin); setActivePanel('detail');
    const el = tableRef.current?.querySelector(`[data-coin="${coin}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const visibleCols = useMemo(() => COLUMNS.filter(c => (c.basic || showAdvanced) && !(c.advanced && !showAdvanced)), [showAdvanced]);
  const meta         = raw?.meta;
  const selectedRow  = sorted.find(r => r.coin === selectedCoin) ?? null;
  const rowH         = density === 'compact' ? 26 : 34;
  const rightOpen    = !!selectedCoin || !!agentResult;

  const Btn = ({ onClick, active, children, color }: { onClick: () => void; active?: boolean; children: React.ReactNode; color?: string }) => (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:4, border:`1px solid ${active ? (color ?? C.teal) : C.border}`, background:active ? `${color ?? C.teal}22` : C.card, color:active ? (color ?? C.teal) : C.dim, fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', letterSpacing:0.5, transition:'all 0.12s' }}>
      {children}
    </button>
  );
  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) => (
    <button onClick={onChange} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:4, border:`1px solid ${value ? C.teal : C.border}`, background:value ? `${C.teal}18` : C.card, color:value ? C.teal : C.dim, fontSize:10, cursor:'pointer', whiteSpace:'nowrap' }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:value ? C.teal : C.dim, transition:'background 0.15s', flexShrink:0 }} />
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
        <Btn onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')}><Settings2 style={{ width:10, height:10 }} /> {density === 'compact' ? 'Compact' : 'Comfort'}</Btn>
        <div style={{ flex:1 }} />
        <Btn onClick={() => refetch()}><RefreshCw style={{ width:10, height:10, ...(isFetching ? { animation:'spin 1s linear infinite' } : {}) }} /> Refresh</Btn>
        <button onClick={runAgent} disabled={agentLoading} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:4, background:agentLoading ? `${C.purple}33` : `linear-gradient(135deg,${C.purple},#7c3aed)`, border:`1px solid ${C.purple}`, color:'#fff', fontSize:10, fontWeight:700, cursor:agentLoading ? 'not-allowed' : 'pointer', letterSpacing:0.5, flexShrink:0, transition:'all 0.15s' }}>
          <Bot style={{ width:12, height:12 }} />{agentLoading ? (agentStage || 'Running…') : 'Agent'}
        </button>
        <Btn onClick={() => { setSearch(''); setMarketType('all'); setSignalFilter('all'); setMinVolume(''); setMinOI(''); }}>Reset</Btn>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:isError ? C.red : isFetching ? C.amber : C.green, boxShadow:`0 0 5px ${isError ? C.red : isFetching ? C.amber : C.green}` }} />
          <span style={{ fontSize:9, color:C.dim }}>{isError ? 'ERROR' : isFetching ? 'FETCHING' : liveUpdates ? 'LIVE' : 'PAUSED'}</span>
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
          <span style={{ fontSize:9, color:C.dim }}>Showing {sorted.length} / {rows.length} assets{dataUpdatedAt ? ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ''}</span>
        </div>
      )}

      {/* ── SUMMARY STRIP ────────────────────────────────────────────── */}
      <div style={{ background:'#07101a', borderBottom:`1px solid ${C.border}`, padding:'5px 12px', display:'flex', gap:7, overflowX:'auto', flexShrink:0, scrollbarWidth:'none', alignItems:'stretch' }}>
        {isLoading
          ? Array.from({ length: 11 }).map((_, i) => <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:'5px 11px', flexShrink:0, minWidth:100, height:42, opacity:0.35 }} />)
          : summaryItems.map(item => (
              <SummaryChip key={item.id} label={item.label} coin={item.coin} value={item.value}
                color={item.color} selected={!!item.coin && selectedCoin === item.coin}
                onClick={item.coin ? () => { setSelectedCoin(item.coin!); setActivePanel('detail'); } : undefined} />
            ))
        }
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── LEFT: Boards + Matrix ───────────────────────────────────── */}
        <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>

          {/* Loading / Error / Empty */}
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

          {/* ── SIGNAL BOARDS GRID ───────────────────────────────────── */}
          {!isLoading && (
            <div style={{ padding:'12px 14px', display:'grid', gridTemplateColumns:`repeat(auto-fill, minmax(${rightOpen ? 200 : 220}px, 1fr))`, gap:10 }}>
              {signalSections.map(sec => (
                <SignalBoard key={sec.id} section={sec} selectedCoin={selectedCoin} onSelect={coin => { setSelectedCoin(coin); setActivePanel('detail'); }} />
              ))}
            </div>
          )}

          {/* ── MARKET MATRIX (collapsible) ──────────────────────────── */}
          {!isLoading && sorted.length > 0 && (
            <div style={{ margin:'0 14px 14px', border:`1px solid ${C.border}`, borderRadius:6, overflow:'hidden' }}>
              <button onClick={() => setShowMatrix(m => !m)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:C.card2, border:'none', cursor:'pointer', color:C.text, borderBottom: showMatrix ? `1px solid ${C.border}` : 'none' }}>
                <BarChart2 style={{ width:12, height:12, color:C.teal }} />
                <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:1.5, color:C.teal, textTransform:'uppercase' }}>Market Matrix</span>
                <span style={{ fontSize:8.5, color:C.dim, marginLeft:4 }}>{sorted.length} assets · full data table</span>
                <span style={{ marginLeft:'auto', color:C.dim }}>
                  {showMatrix ? <ChevronUp style={{ width:12, height:12 }} /> : <ChevronDown style={{ width:12, height:12 }} />}
                </span>
              </button>
              {showMatrix && (
                <div ref={tableRef} style={{ overflow:'auto', maxHeight:380 }}>
                  <table style={{ borderCollapse:'collapse', width:'max-content', minWidth:'100%' }}>
                    <thead>
                      <tr style={{ background:'#060b14', position:'sticky', top:0, zIndex:10 }}>
                        <th style={{ width:30, padding:'4px 7px', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}` }} />
                        {visibleCols.map(col => {
                          const isSorted = sortKey === col.key;
                          return (
                            <th key={col.key} onClick={() => handleSort(col.key)}
                              style={{ width:col.width, minWidth:col.width, padding:'4px 7px', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.dimLow}`, textAlign:col.align ?? 'right', cursor:'pointer', userSelect:'none', background:isSorted ? `${C.teal}12` : 'transparent', whiteSpace:'nowrap', position:col.key==='coin'?'sticky':'static', left:col.key==='coin'?38:'auto', zIndex:col.key==='coin'?5:'auto' }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:col.align==='left'?'flex-start':'flex-end', gap:2 }}>
                                <span style={{ fontSize:7.5, fontWeight:700, letterSpacing:1, color:isSorted?C.teal:C.dim }}>{col.label}</span>
                                {isSorted ? (sortDir==='asc' ? <ChevronUp style={{ width:8, height:8, color:C.teal }} /> : <ChevronDown style={{ width:8, height:8, color:C.teal }} />) : <ChevronsUpDown style={{ width:8, height:8, color:C.dimLow }} />}
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
                        const rowBg = isSel ? `${C.teal}18` : isPinned ? `${C.amber}0c` : isHi ? `${C.purple}18` : idx % 2 === 0 ? C.bg : C.card2;
                        return (
                          <tr key={row.coin} data-coin={row.coin} onClick={() => { setSelectedCoin(c => c === row.coin ? null : row.coin); setActivePanel('detail'); }}
                            onDoubleClick={e => togglePin(row.coin, e as any)}
                            style={{ background:rowBg, cursor:'pointer', height:rowH, transition:'background 0.15s', borderBottom:`1px solid ${C.dimLow}` }}
                            onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = `${C.teal}0c`; }}
                            onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = rowBg; }}>
                            <td onClick={e => togglePin(row.coin, e)} style={{ width:30, padding:'0 7px', borderRight:`1px solid ${C.border}`, textAlign:'center', position:'sticky', left:0, background:rowBg, zIndex:2, cursor:'pointer' }}>
                              <Pin style={{ width:9, height:9, color:isPinned?C.amber:C.dimLow, transform:isPinned?'none':'rotate(45deg)' }} />
                            </td>
                            {visibleCols.map(col => {
                              const v = row[col.key]; const txt = col.fmt(v); const clr = col.color ? col.color(v, row) : C.text;
                              return (
                                <td key={col.key} style={{ padding:`0 7px`, textAlign:col.align??'right', fontFamily:C.font, fontSize:density==='compact'?9:10, color:col.key==='coin'?C.text:clr, fontWeight:col.key==='coin'?700:400, whiteSpace:'nowrap', position:col.key==='coin'?'sticky':'static', left:col.key==='coin'?38:'auto', background:col.key==='coin'?rowBg:'transparent', zIndex:col.key==='coin'?2:'auto', borderRight:`1px solid ${C.dimLow}` }}>
                                  {col.key==='coin'
                                    ? <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>{isPinned&&<span style={{ color:C.amber, fontSize:8 }}>●</span>}{txt}{row.tags?.[0]&&<span style={{ fontSize:7.5, color:C.dim }}>/{row.tags[0]}</span>}</span>
                                    : col.key==='rankDelta' && v != null
                                    ? <span style={{ color:(v as number)>0?C.green:(v as number)<0?C.red:C.dim }}>{txt}</span>
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
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
        {rightOpen && (
          <div style={{ width:310, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0, background:C.card, overflow:'hidden' }}>
            {/* Tab strip */}
            {selectedCoin && agentResult && (
              <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                {(['detail','agent'] as const).map(tab => (
                  <button key={tab} onClick={() => setActivePanel(tab)} style={{ flex:1, padding:'6px 0', fontSize:8.5, fontWeight:700, letterSpacing:1, background:'none', border:'none', cursor:'pointer', color:activePanel===tab?C.teal:C.dim, borderBottom:activePanel===tab?`2px solid ${C.teal}`:'2px solid transparent', textTransform:'uppercase', transition:'color 0.15s' }}>
                    {tab === 'detail' ? 'INTEL' : 'AGENT'}
                  </button>
                ))}
              </div>
            )}
            <div style={{ flex:1, overflow:'hidden' }}>
              {activePanel === 'detail' && selectedRow
                ? <DetailPanel row={selectedRow} detail={assetDetail ?? null} onClose={() => setSelectedCoin(null)} />
                : activePanel === 'agent' && agentResult
                ? <AgentPanel result={agentResult} onJump={jumpToCoin} onClose={() => setAgentResult(null)} />
                : null
              }
            </div>
          </div>
        )}
      </div>

      {/* ── AGENT BOTTOM STRIP ─────────────────────────────────────────── */}
      {agentResult && !rightOpen && (
        <div style={{ borderTop:`1px solid ${C.border}`, background:C.card2, padding:'5px 14px', display:'flex', gap:10, overflowX:'auto', flexShrink:0, alignItems:'center' }}>
          <Bot style={{ width:12, height:12, color:C.purple, flexShrink:0 }} />
          <span style={{ fontSize:8.5, color:C.purple, fontWeight:700, flexShrink:0 }}>AGENT SIGNALS</span>
          {agentResult.longs.slice(0,3).map(item => (
            <span key={item.coin} onClick={() => jumpToCoin(item.coin)} style={{ fontSize:9, color:C.green, cursor:'pointer', fontFamily:C.font, fontWeight:700, background:`${C.green}11`, border:`1px solid ${C.green}33`, borderRadius:3, padding:'1px 7px', flexShrink:0 }}>▲ {item.coin}</span>
          ))}
          {agentResult.shorts.slice(0,3).map(item => (
            <span key={item.coin} onClick={() => jumpToCoin(item.coin)} style={{ fontSize:9, color:C.red, cursor:'pointer', fontFamily:C.font, fontWeight:700, background:`${C.red}11`, border:`1px solid ${C.red}33`, borderRadius:3, padding:'1px 7px', flexShrink:0 }}>▼ {item.coin}</span>
          ))}
          <span style={{ marginLeft:'auto', fontSize:8.5, color:C.dim, flexShrink:0 }}>Click a name to view — or click Agent in sidebar</span>
          <button onClick={() => setAgentResult(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.dim, flexShrink:0 }}><X style={{ width:12, height:12 }} /></button>
        </div>
      )}

      {/* ── AGENT ERROR ──────────────────────────────────────────────── */}
      {agentError && (
        <div style={{ background:`${C.red}18`, borderTop:`1px solid ${C.red}44`, padding:'5px 14px', display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
          <AlertTriangle style={{ width:12, height:12, color:C.red }} />
          <span style={{ fontSize:9.5, color:C.red }}>Agent error: {agentError}</span>
          <button onClick={() => setAgentError(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.red }}><X style={{ width:12, height:12 }} /></button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #253555; }
      `}</style>
    </div>
  );
}
