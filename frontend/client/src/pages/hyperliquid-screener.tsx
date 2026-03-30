import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Search, RefreshCw, Bot, X, ChevronDown, ChevronUp,
  ChevronsUpDown, Zap, AlertTriangle, Wifi, WifiOff, Pin, ArrowUpRight,
  ArrowDownRight, Minus, Filter, Settings2,
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
  font:    "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
};

// ─── Types ─────────────────────────────────────────────────────────────────────
// Backend contract: GET /api/hyperliquid/screener returns { rows: ScreenerRow[], meta: ScreenerMeta }
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
  volume24h:         number | null;
  volume24hBase:     number | null;
  tradeCount:        number | null;
  bidDepth:          number | null;
  askDepth:          number | null;
  bidAskImbalance:   number | null;
  impactBidPx:       number | null;
  impactAskPx:       number | null;
  distMarkOracle:    number | null;
  distMarkPrevDay:   number | null;
  volatility:        number | null;
  momentum:          number | null;
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

// Backend contract: GET /api/hyperliquid/screener returns meta alongside rows
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

// Backend contract: POST /api/hyperliquid/agent-rank → AgentResult
export interface AgentResult {
  rankedCoins: AgentRankedItem[];
  longs:       AgentRankedItem[];
  shorts:      AgentRankedItem[];
  avoid:       AgentRankedItem[];
  summary:     string;
  generatedAt: string;
}
export interface AgentRankedItem {
  coin:        string;
  agentRank:   number;
  agentScore:  number;
  direction:   'long' | 'short' | 'avoid' | 'neutral';
  confidence:  number;
  rationale:   string;
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

// ─── Column Definitions ────────────────────────────────────────────────────────
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
const $$ = (v: number | null, dec = 2) =>
  v == null ? '—' : v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` : `$${v.toFixed(dec)}`;
const px = (v: number | null) =>
  v == null ? '—' : v >= 1000 ? v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) :
  v >= 1 ? v.toFixed(3) : v.toFixed(6);
const sc = (v: number | null) => v == null ? '—' : v.toFixed(2);
const nn = (v: number | null) => v == null ? '—' : v.toLocaleString();
const pctClr = (v: number | null) => v == null ? C.dim : v > 0 ? C.green : v < 0 ? C.red : C.dim;
const scoreClr = (v: number | null) => v == null ? C.dim : v >= 0.6 ? C.green : v <= 0.35 ? C.red : C.amber;
const fundClr = (v: number | null) => v == null ? C.dim : v > 0.01 ? C.green : v < -0.01 ? C.red : C.dim;

const COLUMNS: ColDef[] = [
  { key:'rank',            label:'#',       width:44,  fmt: v => v ?? '—',               align:'right', basic:true },
  { key:'coin',            label:'COIN',    width:90,  fmt: v => v ?? '—',               align:'left',  basic:true },
  { key:'marketType',      label:'MKT',     width:52,  fmt: v => v?.toUpperCase() ?? '—',align:'left',  basic:true },
  { key:'markPrice',       label:'MARK',    width:110, fmt: px,                           align:'right', basic:true },
  { key:'change24hPct',    label:'24H%',    width:76,  fmt: pct,  color: pctClr,          align:'right', basic:true },
  { key:'funding',         label:'FUND%',   width:80,  fmt: v => v == null ? '—' : `${(v*100).toFixed(4)}%`, color: fundClr, align:'right', basic:true },
  { key:'premium',         label:'PREM%',   width:76,  fmt: v => pct(v == null ? null : v*100, 4), color: pctClr, align:'right', basic:true },
  { key:'openInterest',    label:'OI',      width:100, fmt: $$,                           align:'right', basic:true },
  { key:'volume24h',       label:'VOL24H',  width:100, fmt: $$,                           align:'right', basic:true },
  { key:'compositeSignal', label:'SIGNAL',  width:76,  fmt: sc, color: scoreClr,          align:'right', basic:true },
  { key:'signalDirection', label:'DIR',     width:76,  fmt: v => v?.toUpperCase() ?? '—', color: (v) => v === 'bullish' ? C.green : v === 'bearish' ? C.red : C.dim, align:'left', basic:true },
  { key:'signalConfidence',label:'CONF%',   width:72,  fmt: v => v == null ? '—' : `${(v*100).toFixed(0)}%`, color: scoreClr, align:'right', basic:true },
  { key:'oraclePrice',     label:'ORACLE',  width:110, fmt: px,                           align:'right' },
  { key:'midPrice',        label:'MID',     width:110, fmt: px,                           align:'right' },
  { key:'spread',          label:'SPREAD',  width:90,  fmt: v => v == null ? '—' : v.toFixed(5), align:'right' },
  { key:'spreadPct',       label:'SPR%',    width:72,  fmt: v => pct(v == null ? null : v*100, 4), color: pctClr, align:'right' },
  { key:'bboBid',          label:'BID',     width:110, fmt: px, color: () => C.green,    align:'right' },
  { key:'bboAsk',          label:'ASK',     width:110, fmt: px, color: () => C.red,      align:'right' },
  { key:'predictedFunding',label:'PRED%',   width:80,  fmt: v => v == null ? '—' : `${(v*100).toFixed(4)}%`, color: fundClr, align:'right' },
  { key:'oiChangePct',     label:'OI Δ%',   width:76,  fmt: pct, color: pctClr,          align:'right' },
  { key:'volume24hBase',   label:'VOL-B',   width:100, fmt: $$,                          align:'right' },
  { key:'tradeCount',      label:'TRADES',  width:80,  fmt: nn,                          align:'right' },
  { key:'bidDepth',        label:'B-DEPTH', width:100, fmt: $$,                          align:'right', color: () => C.green },
  { key:'askDepth',        label:'A-DEPTH', width:100, fmt: $$,                          align:'right', color: () => C.red },
  { key:'bidAskImbalance', label:'IMBAL',   width:72,  fmt: v => v == null ? '—' : v.toFixed(3), color: pctClr, align:'right' },
  { key:'impactBidPx',     label:'IMP-B',   width:110, fmt: px, color: () => C.green,   align:'right' },
  { key:'impactAskPx',     label:'IMP-A',   width:110, fmt: px, color: () => C.red,     align:'right' },
  { key:'distMarkOracle',  label:'MK-ORC%', width:80,  fmt: v => pct(v == null ? null : v*100, 4), color: pctClr, align:'right' },
  { key:'distMarkPrevDay', label:'MK-PD%',  width:80,  fmt: v => pct(v == null ? null : v*100, 4), color: pctClr, align:'right' },
  { key:'volatility',      label:'VOL-SCR', width:80,  fmt: sc, color: scoreClr,         align:'right' },
  { key:'momentum',        label:'MOM-SCR', width:80,  fmt: sc, color: scoreClr,         align:'right' },
  { key:'liquidityScore',  label:'LIQ-SCR', width:80,  fmt: sc, color: scoreClr,         align:'right' },
  { key:'flowScore',       label:'FLOW',    width:80,  fmt: sc, color: scoreClr,         align:'right' },
  { key:'maxLeverage',     label:'MAX-LEV', width:76,  fmt: v => v == null ? '—' : `${v}x`, align:'right', advanced:true },
  { key:'szDecimals',      label:'SZDEC',   width:60,  fmt: v => v ?? '—',              align:'right', advanced:true },
  { key:'marketStatus',    label:'STATUS',  width:84,  fmt: v => v ?? '—',              align:'left',  advanced:true },
  { key:'agentRank',       label:'A-RANK',  width:72,  fmt: v => v ?? '—',              align:'right', basic:true },
  { key:'agentScore',      label:'A-SCORE', width:80,  fmt: sc, color: scoreClr,         align:'right', basic:true },
  { key:'rankDelta',       label:'Δ RANK',  width:72,  fmt: v => v == null ? '—' : v > 0 ? `▲${v}` : v < 0 ? `▼${Math.abs(v)}` : '—', color: (v) => v > 0 ? C.green : v < 0 ? C.red : C.dim, align:'right', basic:true },
  { key:'updatedAt',       label:'UPDATED', width:90,  fmt: v => v ? new Date(v).toLocaleTimeString() : '—', align:'right' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const dirIcon = (dir: string | null) =>
  dir === 'bullish' ? <ArrowUpRight style={{ width:11, height:11, color:C.green, display:'inline' }} /> :
  dir === 'bearish' ? <ArrowDownRight style={{ width:11, height:11, color:C.red, display:'inline' }} /> :
  <Minus style={{ width:11, height:11, color:C.dim, display:'inline' }} />;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label:string; value:string; sub?:string; color?:string }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:'6px 12px', flexShrink:0, minWidth:110 }}>
      <div style={{ fontSize:8, color:C.dim, letterSpacing:1.5, marginBottom:2, textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontSize:12, fontWeight:700, color: color ?? C.text, fontFamily:C.font }}>{value}</div>
      {sub && <div style={{ fontSize:9, color:C.dim, marginTop:1 }}>{sub}</div>}
    </div>
  );
}

// ─── Signal Badge ─────────────────────────────────────────────────────────────
function SigBadge({ dir }: { dir: string | null }) {
  const col = dir === 'bullish' ? C.green : dir === 'bearish' ? C.red : C.dim;
  return (
    <span style={{ fontSize:9, fontWeight:700, color:col, background:`${col}18`, border:`1px solid ${col}33`, borderRadius:3, padding:'1px 5px', letterSpacing:0.5 }}>
      {dir?.toUpperCase() ?? '—'}
    </span>
  );
}

// ─── Details Panel ────────────────────────────────────────────────────────────
function DetailsPanel({ row, detail, onClose }: { row:ScreenerRow; detail:AssetDetail|null; onClose:()=>void }) {
  const col = row.signalDirection === 'bullish' ? C.green : row.signalDirection === 'bearish' ? C.red : C.teal;
  const Row2 = ({ label, value, vColor }: { label:string; value:string; vColor?:string }) => (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${C.dimLow}` }}>
      <span style={{ fontSize:10, color:C.dim }}>{label}</span>
      <span style={{ fontSize:10, fontFamily:C.font, fontWeight:600, color:vColor ?? C.text }}>{value}</span>
    </div>
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8, background:C.card2, flexShrink:0 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:col, boxShadow:`0 0 6px ${col}` }} />
        <span style={{ fontFamily:C.font, fontWeight:800, fontSize:14, color:C.text }}>{row.coin}</span>
        <span style={{ fontSize:9, color:C.dim, background:C.dimLow, borderRadius:3, padding:'1px 6px' }}>{row.marketType?.toUpperCase()}</span>
        <SigBadge dir={row.signalDirection} />
        <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.dim }}>
          <X style={{ width:14, height:14 }} />
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div style={{ fontSize:8, color:C.teal, letterSpacing:2, marginBottom:6, textTransform:'uppercase' }}>Price Summary</div>
          <Row2 label="Mark Price"    value={px(row.markPrice)}   vColor={C.text} />
          <Row2 label="Oracle Price"  value={px(row.oraclePrice)} />
          <Row2 label="Mid Price"     value={px(row.midPrice)} />
          <Row2 label="24H Change"    value={pct(row.change24hPct)} vColor={pctClr(row.change24hPct)} />
          <Row2 label="BBO Bid"       value={px(row.bboBid)}     vColor={C.green} />
          <Row2 label="BBO Ask"       value={px(row.bboAsk)}     vColor={C.red} />
          <Row2 label="Spread"        value={row.spread == null ? '—' : row.spread.toFixed(5)} />
          <Row2 label="Spread %"      value={pct(row.spreadPct == null ? null : row.spreadPct*100, 4)} />
        </div>
        <div>
          <div style={{ fontSize:8, color:C.teal, letterSpacing:2, marginBottom:6, textTransform:'uppercase' }}>Funding / Premium</div>
          <Row2 label="Funding Rate"  value={row.funding == null ? '—' : `${(row.funding*100).toFixed(4)}%`} vColor={fundClr(row.funding)} />
          <Row2 label="Pred Funding"  value={row.predictedFunding == null ? '—' : `${(row.predictedFunding*100).toFixed(4)}%`} vColor={fundClr(row.predictedFunding)} />
          <Row2 label="Premium"       value={pct(row.premium == null ? null : row.premium*100, 4)} vColor={pctClr(row.premium)} />
          <Row2 label="Mk - Oracle %" value={pct(row.distMarkOracle == null ? null : row.distMarkOracle*100, 4)} vColor={pctClr(row.distMarkOracle)} />
          <Row2 label="Mk - PrevDay %" value={pct(row.distMarkPrevDay == null ? null : row.distMarkPrevDay*100, 4)} vColor={pctClr(row.distMarkPrevDay)} />
        </div>
        <div>
          <div style={{ fontSize:8, color:C.teal, letterSpacing:2, marginBottom:6, textTransform:'uppercase' }}>Volume / OI</div>
          <Row2 label="Open Interest" value={$$(row.openInterest)} />
          <Row2 label="OI Change %"   value={pct(row.oiChangePct)} vColor={pctClr(row.oiChangePct)} />
          <Row2 label="24H Volume"    value={$$(row.volume24h)} />
          <Row2 label="24H Base Vol"  value={$$(row.volume24hBase)} />
          <Row2 label="Trade Count"   value={nn(row.tradeCount)} />
        </div>
        <div>
          <div style={{ fontSize:8, color:C.teal, letterSpacing:2, marginBottom:6, textTransform:'uppercase' }}>Order Book</div>
          <Row2 label="Bid Depth"     value={$$(row.bidDepth)}  vColor={C.green} />
          <Row2 label="Ask Depth"     value={$$(row.askDepth)}  vColor={C.red} />
          <Row2 label="Imbalance"     value={row.bidAskImbalance == null ? '—' : row.bidAskImbalance.toFixed(3)} vColor={pctClr(row.bidAskImbalance)} />
          <Row2 label="Impact Bid"    value={px(row.impactBidPx)} vColor={C.green} />
          <Row2 label="Impact Ask"    value={px(row.impactAskPx)} vColor={C.red} />
        </div>
        <div>
          <div style={{ fontSize:8, color:C.teal, letterSpacing:2, marginBottom:6, textTransform:'uppercase' }}>Scores</div>
          <Row2 label="Composite Signal" value={sc(row.compositeSignal)} vColor={scoreClr(row.compositeSignal)} />
          <Row2 label="Confidence"    value={row.signalConfidence == null ? '—' : `${(row.signalConfidence*100).toFixed(0)}%`} vColor={scoreClr(row.signalConfidence)} />
          <Row2 label="Volatility"    value={sc(row.volatility)} vColor={scoreClr(row.volatility)} />
          <Row2 label="Momentum"      value={sc(row.momentum)} vColor={scoreClr(row.momentum)} />
          <Row2 label="Liquidity"     value={sc(row.liquidityScore)} vColor={scoreClr(row.liquidityScore)} />
          <Row2 label="Flow"          value={sc(row.flowScore)} vColor={scoreClr(row.flowScore)} />
        </div>
        {row.agentRationale && (
          <div>
            <div style={{ fontSize:8, color:C.purple, letterSpacing:2, marginBottom:6, textTransform:'uppercase' }}>Agent Rationale</div>
            <div style={{ fontSize:10, color:C.text, lineHeight:1.6, background:C.dimLow, borderRadius:5, padding:'8px 10px', border:`1px solid ${C.purple}33` }}>
              {row.agentRationale}
            </div>
          </div>
        )}
        {detail?.marketStructure && (
          <div>
            <div style={{ fontSize:8, color:C.amber, letterSpacing:2, marginBottom:6, textTransform:'uppercase' }}>Market Structure</div>
            <div style={{ fontSize:10, color:C.text, lineHeight:1.6, background:C.dimLow, borderRadius:5, padding:'8px 10px' }}>
              {detail.marketStructure}
            </div>
          </div>
        )}
        {detail?.momentumSummary && (
          <div>
            <div style={{ fontSize:8, color:C.amber, letterSpacing:2, marginBottom:6, textTransform:'uppercase' }}>Momentum</div>
            <div style={{ fontSize:10, color:C.text, lineHeight:1.6, background:C.dimLow, borderRadius:5, padding:'8px 10px' }}>
              {detail.momentumSummary}
            </div>
          </div>
        )}
        <div style={{ fontSize:9, color:C.dim, marginTop:4 }}>
          Last updated: {row.updatedAt ? new Date(row.updatedAt).toLocaleTimeString() : '—'}
          {row.maxLeverage != null && <span style={{ marginLeft:12 }}>Max leverage: {row.maxLeverage}×</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Agent Panel ──────────────────────────────────────────────────────────────
function AgentPanel({ result, onJump, onClose }: { result:AgentResult; onJump:(coin:string)=>void; onClose:()=>void }) {
  const Section = ({ title, items, color }: { title:string; items:AgentRankedItem[]; color:string }) => (
    items.length > 0 ? (
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:8, color, letterSpacing:2, marginBottom:6, textTransform:'uppercase', fontWeight:800 }}>{title}</div>
        {items.map((item, i) => (
          <div key={i} onClick={() => onJump(item.coin)} style={{ display:'flex', gap:8, padding:'5px 8px', marginBottom:3, background:C.dimLow, borderRadius:4, cursor:'pointer', border:`1px solid ${color}22`, alignItems:'flex-start' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}55`)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = `${color}22`)}>
            <span style={{ fontSize:10, color, fontWeight:800, fontFamily:C.font, flexShrink:0, minWidth:22 }}>#{item.agentRank}</span>
            <span style={{ fontSize:10, fontWeight:700, color:C.text, fontFamily:C.font, flexShrink:0, minWidth:52 }}>{item.coin}</span>
            <span style={{ fontSize:9, color:C.dim, lineHeight:1.5, flex:1 }}>{item.rationale}</span>
            <span style={{ fontSize:9, fontWeight:700, color, fontFamily:C.font, flexShrink:0 }}>{item.agentScore.toFixed(2)}</span>
          </div>
        ))}
      </div>
    ) : null
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ padding:'8px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8, background:C.card2, flexShrink:0 }}>
        <Bot style={{ width:14, height:14, color:C.purple }} />
        <span style={{ fontSize:11, fontWeight:800, color:C.text, letterSpacing:0.5 }}>AGENT RANKING</span>
        <span style={{ fontSize:9, color:C.dim, marginLeft:4 }}>{new Date(result.generatedAt).toLocaleTimeString()}</span>
        <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.dim }}>
          <X style={{ width:14, height:14 }} />
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
        {result.summary && (
          <div style={{ fontSize:10, color:C.text, lineHeight:1.6, background:`${C.purple}11`, border:`1px solid ${C.purple}33`, borderRadius:5, padding:'8px 10px', marginBottom:14 }}>
            {result.summary}
          </div>
        )}
        <Section title="Strong Longs"  items={result.longs}  color={C.green} />
        <Section title="Strong Shorts" items={result.shorts} color={C.red} />
        <Section title="Avoid / Illiquid" items={result.avoid} color={C.amber} />
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
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Fetch snapshot ──
  const { data: raw, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery<
    { rows: ScreenerRow[]; meta: ScreenerMeta }
  >({
    queryKey: ['hl-screener', marketType],
    queryFn: async () => {
      const r = await fetch(`/api/hyperliquid/screener?market_type=${marketType}&limit=200`);
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      return r.json();
    },
    refetchInterval: liveUpdates ? 8000 : false,
    staleTime: 5000,
    retry: 2,
  });

  // ── Fetch asset detail when a row is selected ──
  const { data: assetDetail } = useQuery<AssetDetail>({
    queryKey: ['hl-asset', selectedCoin],
    queryFn: async () => {
      const r = await fetch(`/api/hyperliquid/asset/${encodeURIComponent(selectedCoin!)}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!selectedCoin,
    staleTime: 10000,
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
      return {
        ...row,
        agentRank:      ag.agentRank,
        agentScore:     ag.agentScore,
        agentRationale: ag.rationale,
        rankDelta:      row.rank - ag.agentRank,
      };
    });
  }, [raw, agentResult]);

  // ── Filter ──
  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(row => row.coin.toLowerCase().includes(q) || row.displayName?.toLowerCase().includes(q));
    }
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
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const d = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? d : -d;
    };
    return [...pinned, ...rest.sort(cmp)];
  }, [filtered, sortKey, sortDir, pinnedCoins]);

  // ── Sort click ──
  const handleSort = useCallback((key: ColKey) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
      setSortDir('asc'); return key;
    });
  }, []);

  // ── Agent run ──
  const runAgent = useCallback(async () => {
    setAgentLoading(true); setAgentError(null); setAgentStage('Sending data to agent…');
    try {
      const payload = { rows: sorted.slice(0, 100).map(r => ({
        coin: r.coin, markPrice: r.markPrice, change24hPct: r.change24hPct,
        funding: r.funding, premium: r.premium, openInterest: r.openInterest,
        volume24h: r.volume24h, compositeSignal: r.compositeSignal,
        signalDirection: r.signalDirection, signalConfidence: r.signalConfidence,
        momentum: r.momentum, liquidityScore: r.liquidityScore, flowScore: r.flowScore,
        volatility: r.volatility, bidAskImbalance: r.bidAskImbalance,
      })) };
      setAgentStage('Agent analyzing markets…');
      const res = await fetch('/api/hyperliquid/agent-rank', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Agent returned ${res.status}`);
      const data: AgentResult = await res.json();
      setAgentResult(data);
      // highlight rows that moved
      const highlights = new Set(data.rankedCoins.filter(r => Math.abs(r.agentRank - (rows.find(x => x.coin === r.coin)?.rank ?? r.agentRank)) >= 3).map(r => r.coin));
      setRowHighlights(highlights);
      setTimeout(() => setRowHighlights(new Set()), 4000);
      if (autoRerank) setSortKey('agentRank');
    } catch (e: any) {
      setAgentError(e.message ?? 'Agent failed');
    } finally {
      setAgentLoading(false); setAgentStage('');
    }
  }, [sorted, rows, autoRerank]);

  // ── Toggle pin ──
  const togglePin = useCallback((coin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedCoins(prev => { const s = new Set(prev); s.has(coin) ? s.delete(coin) : s.add(coin); return s; });
  }, []);

  // ── Jump to coin ──
  const jumpToCoin = useCallback((coin: string) => {
    setSelectedCoin(coin);
    const el = tableRef.current?.querySelector(`[data-coin="${coin}"]`);
    el?.scrollIntoView({ behavior:'smooth', block:'center' });
  }, []);

  // ── Visible columns ──
  const visibleCols = useMemo(() =>
    COLUMNS.filter(c => (c.basic || showAdvanced) && !(c.advanced && !showAdvanced)),
  [showAdvanced]);

  const meta = raw?.meta;
  const selectedRow = sorted.find(r => r.coin === selectedCoin) ?? null;
  const rowH = density === 'compact' ? 28 : 36;
  const detailsOpen = !!selectedCoin;
  const agentOpen   = !!agentResult;
  const rightPanelOpen = detailsOpen || agentOpen;

  const Btn = ({ onClick, active, children, color }: { onClick:()=>void; active?:boolean; children:React.ReactNode; color?:string }) => (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:4, border:`1px solid ${active ? (color ?? C.teal) : C.border}`, background: active ? `${color ?? C.teal}22` : C.card, color: active ? (color ?? C.teal) : C.dim, fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', letterSpacing:0.5, transition:'all 0.12s' }}>
      {children}
    </button>
  );

  const Toggle = ({ label, value, onChange }: { label:string; value:boolean; onChange:()=>void }) => (
    <button onClick={onChange} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:4, border:`1px solid ${value ? C.teal : C.border}`, background: value ? `${C.teal}18` : C.card, color: value ? C.teal : C.dim, fontSize:10, cursor:'pointer', whiteSpace:'nowrap' }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background: value ? C.teal : C.dim, transition:'background 0.15s', flexShrink:0 }} />
      {label}
    </button>
  );

  return (
    <div style={{ background:C.bg, color:C.text, fontFamily:C.font, fontSize:11, height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────── */}
      <div style={{ background:'#060b14', borderBottom:`1px solid ${C.border}`, padding:'0 12px', height:44, display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'nowrap', overflowX:'auto' }}>
        {/* Identity */}
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
          {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:5, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.dim }}>
            <X style={{ width:10, height:10 }} />
          </button>}
        </div>

        {/* Market type filter */}
        <select value={marketType} onChange={e => setMarketType(e.target.value as any)}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 8px', fontSize:10, color:C.text, cursor:'pointer', flexShrink:0 }}>
          <option value="all">All Markets</option>
          <option value="perp">Perps Only</option>
          <option value="spot">Spot Only</option>
        </select>

        {/* Signal filter */}
        <select value={signalFilter} onChange={e => setSignalFilter(e.target.value as any)}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 8px', fontSize:10, color:C.text, cursor:'pointer', flexShrink:0 }}>
          <option value="all">All Signals</option>
          <option value="bullish">Bullish Only</option>
          <option value="bearish">Bearish Only</option>
        </select>

        {/* More filters toggle */}
        <Btn onClick={() => setShowFilters(f => !f)} active={showFilters}>
          <Filter style={{ width:10, height:10 }} /> Filters
        </Btn>

        <div style={{ width:1, height:22, background:C.border, flexShrink:0, margin:'0 4px' }} />

        {/* Toggles */}
        <Toggle label="Live" value={liveUpdates} onChange={() => setLiveUpdates(v => !v)} />
        <Toggle label="Auto-rank" value={autoRerank} onChange={() => setAutoRerank(v => !v)} />
        <Toggle label="Advanced" value={showAdvanced} onChange={() => setShowAdvanced(v => !v)} />
        <Btn onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')}>
          <Settings2 style={{ width:10, height:10 }} /> {density === 'compact' ? 'Compact' : 'Comfort'}
        </Btn>

        <div style={{ flex:1 }} />

        {/* Action buttons */}
        <Btn onClick={() => refetch()}><RefreshCw style={{ width:10, height:10, ...(isFetching ? { animation:'spin 1s linear infinite' } : {}) }} /> Refresh</Btn>
        <button onClick={runAgent} disabled={agentLoading}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:4, background: agentLoading ? `${C.purple}33` : `linear-gradient(135deg,${C.purple},#7c3aed)`, border:`1px solid ${C.purple}`, color:'#fff', fontSize:10, fontWeight:700, cursor: agentLoading ? 'not-allowed' : 'pointer', letterSpacing:0.5, flexShrink:0, transition:'all 0.15s' }}>
          <Bot style={{ width:12, height:12 }} />
          {agentLoading ? (agentStage || 'Running…') : 'Agent'}
        </button>
        <Btn onClick={() => { setSearch(''); setMarketType('all'); setSignalFilter('all'); setMinVolume(''); setMinOI(''); }}>
          Reset
        </Btn>

        {/* Live dot */}
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background: isError ? C.red : isFetching ? C.amber : C.green, boxShadow:`0 0 5px ${isError ? C.red : isFetching ? C.amber : C.green}` }} />
          <span style={{ fontSize:9, color:C.dim }}>
            {isError ? 'ERROR' : isFetching ? 'FETCHING' : liveUpdates ? 'LIVE' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* ── FILTER BAR (collapsible) ──────────────────────────────────── */}
      {showFilters && (
        <div style={{ background:C.card2, borderBottom:`1px solid ${C.border}`, padding:'6px 14px', display:'flex', gap:10, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
          <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:C.dim }}>
            Min Vol ($M):
            <input value={minVolume} onChange={e => setMinVolume(e.target.value)} placeholder="e.g. 10"
              style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:3, padding:'3px 6px', fontSize:10, color:C.text, width:70, outline:'none' }} />
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:C.dim }}>
            Min OI ($M):
            <input value={minOI} onChange={e => setMinOI(e.target.value)} placeholder="e.g. 5"
              style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:3, padding:'3px 6px', fontSize:10, color:C.text, width:70, outline:'none' }} />
          </label>
          <span style={{ fontSize:9, color:C.dim }}>
            Showing {sorted.length} / {rows.length} assets
            {dataUpdatedAt ? ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ''}
          </span>
        </div>
      )}

      {/* ── KPI STRIP ─────────────────────────────────────────────────── */}
      <div style={{ background:`#07101a`, borderBottom:`1px solid ${C.border}`, padding:'6px 12px', display:'flex', gap:8, overflowX:'auto', flexShrink:0, scrollbarWidth:'none', alignItems:'stretch' }}>
        {isLoading ? (
          Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:'6px 12px', flexShrink:0, minWidth:110, height:44, opacity:0.4 }} />
          ))
        ) : meta ? (
          <>
            <KpiCard label="Total Assets"   value={String(meta.totalAssets ?? sorted.length)}  />
            <KpiCard label="Gainers"         value={String(meta.gainers ?? '—')}    color={C.green} sub={`${meta.losers ?? '—'} losers`} />
            <KpiCard label="Top Mover"       value={meta.topMover ?? '—'}           color={C.teal}  sub={meta.topMoverPct != null ? pct(meta.topMoverPct) : undefined} />
            <KpiCard label="Largest Volume"  value={meta.largestVolumeCoin ?? '—'}  sub={$$(meta.largestVolume)} />
            <KpiCard label="Largest OI"      value={meta.largestOICoin ?? '—'}      sub={$$(meta.largestOI)} />
            <KpiCard label="Highest Funding" value={meta.highestFundingCoin ?? '—'} color={C.green} sub={meta.highestFunding != null ? `${(meta.highestFunding*100).toFixed(4)}%` : undefined} />
            <KpiCard label="Lowest Funding"  value={meta.lowestFundingCoin ?? '—'}  color={C.red}   sub={meta.lowestFunding != null ? `${(meta.lowestFunding*100).toFixed(4)}%` : undefined} />
            {agentResult && <KpiCard label="Agent Top Long"  value={agentResult.longs[0]?.coin ?? '—'}   color={C.green} sub={agentResult.longs[0] ? `Score: ${agentResult.longs[0].agentScore.toFixed(2)}` : undefined} />}
            {agentResult && <KpiCard label="Agent Top Short" value={agentResult.shorts[0]?.coin ?? '—'}  color={C.red}   sub={agentResult.shorts[0] ? `Score: ${agentResult.shorts[0].agentScore.toFixed(2)}` : undefined} />}
            <KpiCard label="Last Updated"    value={meta.lastUpdated ? new Date(meta.lastUpdated).toLocaleTimeString() : '—'} sub={meta.serverTs ? `Server: ${new Date(meta.serverTs).toLocaleTimeString()}` : undefined} />
          </>
        ) : (
          <span style={{ fontSize:10, color:C.dim, alignSelf:'center' }}>
            {isError ? `Error loading data — ${(error as any)?.message}` : 'No data yet'}
          </span>
        )}
      </div>

      {/* ── MAIN AREA ─────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── TABLE ──────────────────────────────────────────────────── */}
        <div ref={tableRef} style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
          {/* Error / empty states */}
          {isError && !isLoading && (
            <div style={{ padding:32, textAlign:'center' }}>
              <AlertTriangle style={{ width:24, height:24, color:C.amber, marginBottom:10 }} />
              <div style={{ fontSize:12, color:C.amber, marginBottom:6 }}>Failed to load screener data</div>
              <div style={{ fontSize:10, color:C.dim, marginBottom:12 }}>{(error as any)?.message}</div>
              <button onClick={() => refetch()} style={{ background:C.teal, color:'#fff', border:'none', borderRadius:4, padding:'6px 16px', fontSize:10, cursor:'pointer' }}>Retry</button>
            </div>
          )}
          {isLoading && (
            <div style={{ padding:40, textAlign:'center', color:C.dim, fontSize:11 }}>
              <div style={{ width:24, height:24, border:`2px solid ${C.border}`, borderTopColor:C.teal, borderRadius:'50%', animation:'spin 0.9s linear infinite', margin:'0 auto 12px' }} />
              Loading Hyperliquid markets…
            </div>
          )}
          {!isLoading && !isError && sorted.length === 0 && (
            <div style={{ padding:40, textAlign:'center', color:C.dim, fontSize:11 }}>
              No assets match your filters. <button onClick={() => { setSearch(''); setSignalFilter('all'); }} style={{ color:C.teal, background:'none', border:'none', cursor:'pointer', fontSize:11 }}>Clear filters</button>
            </div>
          )}

          {/* Table */}
          {!isLoading && sorted.length > 0 && (
            <table style={{ borderCollapse:'collapse', width:'max-content', minWidth:'100%' }}>
              <thead>
                <tr style={{ background:'#060b14', position:'sticky', top:0, zIndex:10 }}>
                  <th style={{ width:32, padding:'6px 8px', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}` }} />
                  {visibleCols.map(col => {
                    const isSorted = sortKey === col.key;
                    return (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        style={{ width:col.width, minWidth:col.width, padding:'5px 8px', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.dimLow}`, textAlign: col.align ?? 'right', cursor:'pointer', userSelect:'none', background: isSorted ? `${C.teal}12` : 'transparent', whiteSpace:'nowrap', position: col.key === 'coin' ? 'sticky' : 'static', left: col.key === 'coin' ? 44 : 'auto', zIndex: col.key === 'coin' ? 5 : 'auto' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent: col.align === 'left' ? 'flex-start' : 'flex-end', gap:3 }}>
                          <span style={{ fontSize:8, fontWeight:700, letterSpacing:1, color: isSorted ? C.teal : C.dim }}>{col.label}</span>
                          {isSorted ? (sortDir === 'asc' ? <ChevronUp style={{ width:9, height:9, color:C.teal }} /> : <ChevronDown style={{ width:9, height:9, color:C.teal }} />) : <ChevronsUpDown style={{ width:9, height:9, color:C.dimLow }} />}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => {
                  const isSelected  = selectedCoin === row.coin;
                  const isPinned    = pinnedCoins.has(row.coin);
                  const isHighlight = rowHighlights.has(row.coin);
                  const rowBg = isSelected ? `${C.teal}18` : isPinned ? `${C.amber}0c` : isHighlight ? `${C.purple}18` : idx % 2 === 0 ? C.bg : C.card2;
                  return (
                    <tr key={row.coin} data-coin={row.coin}
                      onClick={() => setSelectedCoin(c => c === row.coin ? null : row.coin)}
                      onDoubleClick={e => togglePin(row.coin, e as any)}
                      style={{ background:rowBg, cursor:'pointer', height:rowH, transition:'background 0.2s', borderBottom:`1px solid ${C.dimLow}` }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = `${C.teal}0c`; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = rowBg; }}>
                      {/* Pin cell */}
                      <td onClick={e => togglePin(row.coin, e)} style={{ width:32, padding:'0 8px', borderRight:`1px solid ${C.border}`, textAlign:'center', position:'sticky', left:0, background:rowBg, zIndex:2 }}>
                        <Pin style={{ width:10, height:10, color: isPinned ? C.amber : C.dimLow, transform: isPinned ? 'none' : 'rotate(45deg)', transition:'all 0.15s' }} />
                      </td>
                      {/* Data cells */}
                      {visibleCols.map(col => {
                        const v   = row[col.key];
                        const txt = col.fmt(v);
                        const clr = col.color ? col.color(v, row) : C.text;
                        const isAgentRank = col.key === 'agentRank';
                        return (
                          <td key={col.key}
                            style={{ padding:`0 8px`, textAlign: col.align ?? 'right', fontFamily:C.font, fontSize: density === 'compact' ? 10 : 11, color: col.key === 'coin' ? C.text : clr, fontWeight: col.key === 'coin' ? 700 : 400, whiteSpace:'nowrap', position: col.key === 'coin' ? 'sticky' : 'static', left: col.key === 'coin' ? 44 : 'auto', background: col.key === 'coin' ? rowBg : 'transparent', zIndex: col.key === 'coin' ? 2 : 'auto', borderRight:`1px solid ${C.dimLow}` }}>
                            {col.key === 'signalDirection'
                              ? <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>{dirIcon(v as string)}{txt}</span>
                              : col.key === 'coin'
                              ? <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                                  {isPinned && <span style={{ color:C.amber, fontSize:8 }}>●</span>}
                                  {txt}
                                  {row.tags?.length > 0 && <span style={{ fontSize:8, color:C.dim }}>/{row.tags[0]}</span>}
                                </span>
                              : col.key === 'rankDelta' && v != null
                              ? <span style={{ color: (v as number) > 0 ? C.green : (v as number) < 0 ? C.red : C.dim }}>{txt}</span>
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
          )}
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
        {rightPanelOpen && (
          <div style={{ width:320, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0, background:C.card, overflow:'hidden' }}>
            {/* Details tab / Agent tab switcher */}
            {detailsOpen && agentOpen && (
              <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                {['DETAILS','AGENT'].map(tab => (
                  <button key={tab} onClick={() => { if (tab === 'AGENT' && agentResult) { setSelectedCoin(null); } else if (tab === 'DETAILS') { /* keep */ } }}
                    style={{ flex:1, padding:'7px 0', fontSize:9, fontWeight:700, letterSpacing:1, background:'none', border:'none', cursor:'pointer', color:C.dim, borderBottom:`2px solid transparent` }}>
                    {tab}
                  </button>
                ))}
              </div>
            )}
            <div style={{ flex:1, overflow:'hidden' }}>
              {selectedRow ? (
                <DetailsPanel row={selectedRow} detail={assetDetail ?? null} onClose={() => setSelectedCoin(null)} />
              ) : agentResult ? (
                <AgentPanel result={agentResult} onJump={jumpToCoin} onClose={() => setAgentResult(null)} />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ── AGENT ERROR BANNER ────────────────────────────────────────── */}
      {agentError && (
        <div style={{ background:`${C.red}18`, borderTop:`1px solid ${C.red}44`, padding:'6px 14px', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <AlertTriangle style={{ width:12, height:12, color:C.red }} />
          <span style={{ fontSize:10, color:C.red }}>Agent error: {agentError}</span>
          <button onClick={() => setAgentError(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.red }}>
            <X style={{ width:12, height:12 }} />
          </button>
        </div>
      )}

      {/* ── AGENT PANEL (bottom strip when no details selected) ────────── */}
      {agentResult && !rightPanelOpen && (
        <div style={{ borderTop:`1px solid ${C.border}`, background:C.card2, padding:'6px 14px', display:'flex', gap:12, overflowX:'auto', flexShrink:0, alignItems:'center' }}>
          <Bot style={{ width:12, height:12, color:C.purple, flexShrink:0 }} />
          <span style={{ fontSize:9, color:C.purple, fontWeight:700, flexShrink:0 }}>AGENT SIGNAL</span>
          {agentResult.longs.slice(0,3).map(item => (
            <span key={item.coin} onClick={() => jumpToCoin(item.coin)} style={{ fontSize:9, color:C.green, cursor:'pointer', fontFamily:C.font, fontWeight:700, background:`${C.green}11`, border:`1px solid ${C.green}33`, borderRadius:3, padding:'1px 6px' }}>
              ▲ {item.coin}
            </span>
          ))}
          {agentResult.shorts.slice(0,3).map(item => (
            <span key={item.coin} onClick={() => jumpToCoin(item.coin)} style={{ fontSize:9, color:C.red, cursor:'pointer', fontFamily:C.font, fontWeight:700, background:`${C.red}11`, border:`1px solid ${C.red}33`, borderRadius:3, padding:'1px 6px' }}>
              ▼ {item.coin}
            </span>
          ))}
          <span style={{ marginLeft:'auto', fontSize:9, color:C.dim, flexShrink:0 }}>
            Click Agent panel → click a coin to view details
          </span>
          <button onClick={() => setAgentResult(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.dim, flexShrink:0 }}>
            <X style={{ width:12, height:12 }} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #080c13; }
        ::-webkit-scrollbar-thumb { background: #1a2540; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #253555; }
      `}</style>
    </div>
  );
}
