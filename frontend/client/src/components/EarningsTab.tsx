import { useState, useMemo, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useEarningsLive } from '@/contexts/EarningsLiveContext';
import { LiveEarningsCard } from '@/components/LiveEarningsCard';
import type { LiveEarningsEvent } from '@/types/live-earnings';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

/* ── TypeScript interfaces ──────────────────────────────────────── */
type EarningsTiming = 'bmo' | 'amc' | 'during_market' | 'unknown';
type TimingConfidence = 'confirmed' | 'inferred_high' | 'inferred_low' | 'unknown';
type EpsTransitionType =
  | 'profit_increased' | 'profit_decreased' | 'turned_profitable'
  | 'turned_negative' | 'loss_narrowed' | 'loss_widened' | 'flat' | 'unavailable';

interface EpsGrowth {
  raw_growth_pct: number | null;
  transition_type: EpsTransitionType | null;
}

interface PriceReaction {
  baseline_date: string | null;
  baseline_close: number | null;
  first_reaction_session: string | null;
  sessions_used: string[];
  opening_gap_pct: number | null;
  reaction_1d_pct: number | null;
  reaction_3d_pct: number | null;
  reaction_5d_pct: number | null;
  max_upside_5d_pct: number | null;
  max_drawdown_5d_pct: number | null;
  bars_source: string | null;
  calculation_method: string | null;
  calculation_confidence: string | null;
  reactions_final: boolean;
  pre_earnings_1d_pct: number | null;
  post_earnings_1d_pct: number | null;
  pre_earnings_session: string | null;
  post_earnings_session: string | null;
  pre_post_method: string | null;
  pre_post_confidence: string | null;
}

interface EarningsQuarter {
  date: string | null;
  timing: EarningsTiming | null;
  timing_confidence: TimingConfidence | null;
  timing_source: string | null;
  fiscal_year: string | null;
  fiscal_period: string | null;
  report_status: string | null;
  join_method: string | null;
  eps_actual: number | null;
  eps_estimate: number | null;
  eps_surprise_pct: number | null;
  eps_surprise_amount: number | null;
  eps_qoq: EpsGrowth | null;
  eps_yoy: EpsGrowth | null;
  revenue_actual: number | null;
  revenue_estimate: number | null;
  revenue_surprise_pct: number | null;
  revenue_surprise_amount: number | null;
  revenue_qoq_pct: number | null;
  revenue_yoy_pct: number | null;
  price_reaction: PriceReaction | null;
}

interface ReactionSummary {
  average_1d_pct: number | null;
  median_1d_pct: number | null;
  average_3d_pct: number | null;
  average_5d_pct: number | null;
  average_absolute_1d_pct: number | null;
  positive_1d_rate: number | null;
  positive_1d_count: number | null;
  negative_1d_count: number | null;
  observations_1d: number | null;
  observations_3d: number | null;
  observations_5d: number | null;
  largest_positive_1d_pct: number | null;
  largest_negative_1d_pct: number | null;
  average_1d_after_double_beat: number | null;
  average_1d_after_double_miss: number | null;
  average_1d_after_mixed_result: number | null;
  observations_pre_1d: number | null;
  observations_post_1d: number | null;
  average_pre_1d_pct: number | null;
  median_pre_1d_pct: number | null;
  average_post_1d_pct: number | null;
  median_post_1d_pct: number | null;
  average_absolute_pre_1d_pct: number | null;
  average_absolute_post_1d_pct: number | null;
  continuation_count: number | null;
  reversal_count: number | null;
  continuation_rate: number | null;
  reversal_rate: number | null;
  average_post_after_positive_pre: number | null;
  average_post_after_negative_pre: number | null;
  summary_method: string | null;
  summary_confidence: string | null;
}

interface RatingsConsensus {
  buy: number;
  hold: number;
  sell: number;
  strong_buy: number;
  strong_sell: number;
  total_ratings: number;
  consensus_label: string;
}

interface PriceTarget {
  low: number | null;
  high: number | null;
  median: number | null;
  average: number | null;
}

interface PriceTargetSummary {
  last_month_average: number | null;
  last_month_count: number | null;
  last_quarter_average: number | null;
  last_quarter_count: number | null;
  last_year_average: number | null;
  last_year_count: number | null;
  all_time_average: number | null;
  all_time_count: number | null;
  publishers: string[] | null;
}

interface MonthlyRatingDistribution {
  month: string;
  strong_buy: number;
  buy: number;
  hold: number;
  sell: number;
  strong_sell: number;
  total_ratings: number;
}

interface RatingAction {
  date: string;
  firm: string;
  action: string;
  previous_grade: string | null;
  new_grade: string | null;
}

interface RatingsData {
  consensus: RatingsConsensus | Record<string, never>;
  price_target: PriceTarget | null;
  price_target_summary: PriceTargetSummary | null;
  monthly_distribution: MonthlyRatingDistribution[];
  recent_actions: RatingAction[];
}

interface EarningsCoverage {
  has_earnings_history: boolean;
  has_reactions: boolean;
  has_ratings_consensus: boolean;
  has_rating_actions: boolean;
  has_rating_history: boolean;
  has_price_targets: boolean;
}

interface SourceStatus {
  earnings_fetched_at: string | null;
  ratings_fetched_at: string | null;
  history_bars_source: string | null;
  sec_filings_omitted_reason: string | null;
  errors: Record<string, string>;
  coverage: EarningsCoverage;
}

/* ── Materials interfaces (exact deployed structure) ─────────────── */
type TranscriptStatusType =
  | 'available_official' | 'available_sec_exhibit' | 'available_licensed'
  | 'processing' | 'not_yet_available' | 'unavailable' | 'unknown';

interface TranscriptInfo {
  status: TranscriptStatusType;
  source_type: string | null;
  source_url: string | null;
}

interface EarningsDocument {
  form: string | null;
  accession_number: string | null;
  filed_date: string | null;
  accepted_at: string | null;
  document_type: string | null;
  description: string | null;
  filename: string | null;
  document_url: string | null;
  filing_index_url: string | null;
  classification: string | null;
  classification_confidence: string | null;
  text_inspected: boolean | null;
  source: string | null;
}

interface PrimaryFilingRef {
  form: string | null;
  accession_number: string | null;
  filed_date: string | null;
  accepted_at: string | null;
  filing_index_url: string | null;
  items: string | null;
}

interface FilingAttachment {
  filename: string | null;
  document_type: string | null;
  description: string | null;
  document_url: string | null;
  classification: string | null;
  classification_confidence: string | null;
  classification_method: string | null;
  text_inspected: boolean | null;
}

interface RecentFiling {
  form: string;
  category: string;
  filed_date: string;
  accepted_at: string;
  accession_number: string;
  title: string | null;
  items: string | null;
  filing_index_url: string;
  primary_document_url: string | null;
  discovery_method: string | null;
  attachments_complete: boolean;
  attachments: FilingAttachment[];
}

interface LatestEarningsPacket {
  earnings_date: string | null;
  detected_at: string | null;
  days_since_filing: number | null;
  attachments_complete: boolean;
  discovery_method: string | null;
  primary_filing: PrimaryFilingRef | null;
  earnings_release: EarningsDocument | null;
  investor_presentation: EarningsDocument | null;
  supplemental_tables: EarningsDocument[];
  guidance_documents: EarningsDocument[];
  prepared_remarks: EarningsDocument | null;
  related_financial_report: EarningsDocument | null;
  webcast_url: string | null;
  webcast_source_document: string | null;
  webcast_extraction_confidence: string | null;
  transcript: TranscriptInfo | null;
}

interface MaterialsData {
  latest_earnings_packet: LatestEarningsPacket | null;
  recent_filings: RecentFiling[];
  source_status: Record<string, unknown>;
  _cached_at: string | null;
}

export interface EarningsIntelligence {
  schema_version: number;
  earnings_history: EarningsQuarter[];
  reaction_summary: ReactionSummary | null;
  ratings: RatingsData;
  materials: MaterialsData | null;
  sec_filings: null;
  source_status: SourceStatus;
  live_event?: LiveEarningsEvent | null;
}

/**
 * The backend intentionally allows every earnings subsection to be null or
 * empty. Normalize only the container defaults so each existing sub-tab can
 * render its own localized empty state instead of taking down the whole tab.
 */
function normalizeEarningsIntelligence(value: unknown): EarningsIntelligence | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, any>;
  const coverage = raw.source_status?.coverage ?? {};
  return {
    schema_version: Number(raw.schema_version ?? 1),
    earnings_history: Array.isArray(raw.earnings_history) ? raw.earnings_history : [],
    reaction_summary: raw.reaction_summary && typeof raw.reaction_summary === 'object' ? raw.reaction_summary : null,
    ratings: {
      consensus: raw.ratings?.consensus && typeof raw.ratings.consensus === 'object' ? raw.ratings.consensus : {},
      price_target: raw.ratings?.price_target && typeof raw.ratings.price_target === 'object' ? raw.ratings.price_target : null,
      price_target_summary: raw.ratings?.price_target_summary && typeof raw.ratings.price_target_summary === 'object' ? raw.ratings.price_target_summary : null,
      monthly_distribution: Array.isArray(raw.ratings?.monthly_distribution) ? raw.ratings.monthly_distribution : [],
      recent_actions: Array.isArray(raw.ratings?.recent_actions) ? raw.ratings.recent_actions : [],
    },
    materials: raw.materials && typeof raw.materials === 'object' ? {
      latest_earnings_packet: raw.materials.latest_earnings_packet ?? null,
      recent_filings: Array.isArray(raw.materials.recent_filings) ? raw.materials.recent_filings : [],
      source_status: raw.materials.source_status ?? {},
      _cached_at: raw.materials._cached_at ?? null,
    } : null,
    sec_filings: null,
    source_status: {
      earnings_fetched_at: raw.source_status?.earnings_fetched_at ?? null,
      ratings_fetched_at: raw.source_status?.ratings_fetched_at ?? null,
      history_bars_source: raw.source_status?.history_bars_source ?? null,
      sec_filings_omitted_reason: raw.source_status?.sec_filings_omitted_reason ?? null,
      errors: raw.source_status?.errors ?? {},
      coverage: {
        has_earnings_history: coverage.has_earnings_history === true,
        has_reactions: coverage.has_reactions === true,
        has_ratings_consensus: coverage.has_ratings_consensus === true,
        has_rating_actions: coverage.has_rating_actions === true,
        has_rating_history: coverage.has_rating_history === true,
        has_price_targets: coverage.has_price_targets === true,
      },
    },
    live_event: raw.live_event ?? null,
  };
}

/* ── style constants ──────────────────────────────────────────── */
const _f = "'JetBrains Mono','Fira Code',monospace";
const _s = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/* ── formatters ───────────────────────────────────────────────── */
function fmtRev(v: number | null): string {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (a >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3)  return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
function fmtRevShort(v: number): string {
  if (!isFinite(v)) return '';
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (a >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}
function fmtEps(v: number | null): string {
  if (v == null || !isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`;
}
function fmtPct(v: number | null, signed = true): string {
  if (v == null || !isFinite(v)) return '—';
  if (signed) return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  return `${v.toFixed(1)}%`;
}
function fmtPrice(v: number | null): string {
  if (v == null || !isFinite(v)) return '—';
  return `$${v.toFixed(2)}`;
}
function fmtDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US',
      { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  } catch { return d; }
}
function fmtDateShort(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US',
      { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch { return d; }
}
function fmtMonthLabel(d: string): string {
  try {
    const dt = new Date(d + 'T00:00:00Z');
    return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', "'");
  } catch { return d; }
}
function fmtQuarter(q: EarningsQuarter): string {
  if (q.fiscal_period && q.fiscal_year) return `${q.fiscal_period}'${String(q.fiscal_year).slice(-2)}`;
  if (q.date) {
    const d = new Date(q.date + 'T00:00:00Z');
    const mo = d.getUTCMonth();
    return `Q${Math.floor(mo / 3) + 1}'${String(d.getUTCFullYear()).slice(-2)}`;
  }
  return '—';
}

/* ── EPS transition ─────────────────────────────────────────── */
const EPS_SHORT: Record<string, string> = {
  profit_increased: 'Profit ↑', profit_decreased: 'Profit ↓',
  turned_profitable: 'Profitable', turned_negative: 'Turned −',
  loss_narrowed: 'Loss ↓', loss_widened: 'Loss ↑',
  flat: 'Flat', unavailable: '—',
};
const EPS_LONG: Record<string, string> = {
  profit_increased: 'Profit increased', profit_decreased: 'Profit decreased',
  turned_profitable: 'Turned profitable', turned_negative: 'Turned negative',
  loss_narrowed: 'Loss narrowed', loss_widened: 'Loss widened',
  flat: 'Flat', unavailable: '—',
};
function epsTransition(g: EpsGrowth | null, long = false): string {
  if (!g || !g.transition_type) return '—';
  return (long ? EPS_LONG : EPS_SHORT)[g.transition_type] ?? '—';
}

/* ── timing ─────────────────────────────────────────────────── */
const TIMING_BADGE: Record<string, string> = { bmo: 'BMO', amc: 'AMC', during_market: 'MKTHR', unknown: 'TIMING?' };
const TIMING_FULL: Record<string, string> = {
  bmo: 'Before Market Open', amc: 'After Market Close',
  during_market: 'During Market Hours', unknown: 'Timing Unknown',
};

/* ── surprise ───────────────────────────────────────────────── */
function surpriseBucket(pct: number | null): 'beat' | 'miss' | 'inline' | null {
  if (pct == null) return null;
  if (pct > 2) return 'beat';
  if (pct < -2) return 'miss';
  return 'inline';
}
function surpriseLabel(pct: number | null): string {
  const b = surpriseBucket(pct);
  if (b === 'beat') return 'Beat';
  if (b === 'miss') return 'Miss';
  if (b === 'inline') return 'In line';
  return '';
}
function surpriseCol(pct: number | null, C: any): string {
  const b = surpriseBucket(pct);
  if (b === 'beat') return C.green;
  if (b === 'miss') return C.red;
  if (b === 'inline') return C.amber;
  return C.dim;
}
function pctCol(v: number | null, C: any): string {
  if (v == null) return C.dim;
  return v >= 0 ? C.green : C.red;
}

/* ── expected growth (upcoming quarters only) ─────────────────── */
function calcExpectedGrowth(estimate: number | null, priorActual: number | null): { pct: number | null; label: string | null } {
  if (estimate == null || priorActual == null || !isFinite(estimate) || !isFinite(priorActual) || priorActual === 0) return { pct: null, label: null };
  if (priorActual > 0 && estimate > 0) return { pct: ((estimate / priorActual) - 1) * 100, label: null };
  if (priorActual > 0 && estimate <= 0) return { pct: null, label: 'Loss expected' };
  if (priorActual < 0 && estimate >= 0) return { pct: null, label: 'Profit expected' };
  if (priorActual < 0 && estimate < 0) return { pct: null, label: estimate > priorActual ? 'Loss narrowing' : 'Loss widening' };
  return { pct: null, label: null };
}
function fmtExpGrowth(pct: number | null, label: string | null): string {
  if (label) return label;
  if (pct == null || !isFinite(pct)) return '—';
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

/* ── upcoming estimate change vs latest reported actual ───────── */
function fmtRevDelta(delta: number): string {
  const s = delta >= 0 ? '+' : '-';
  const a = Math.abs(delta);
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9)  return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6)  return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3)  return `${s}$${(a / 1e3).toFixed(1)}K`;
  return `${s}$${a.toFixed(0)}`;
}
function fmtEpsDelta(delta: number): string {
  const a = Math.abs(delta);
  return delta >= 0 ? `+$${a.toFixed(2)}` : `-$${a.toFixed(2)}`;
}
interface EstChange { amtStr: string; pctStr: string | null; qualifier: string | null; color: string }
function calcRevChange(upRev: number | null, latestActual: number | null): EstChange | null {
  if (upRev == null || !isFinite(upRev) || latestActual == null || !isFinite(latestActual)) return null;
  const delta = upRev - latestActual;
  const pctStr = latestActual > 0 ? fmtPct(((upRev / latestActual) - 1) * 100) : null;
  return { amtStr: fmtRevDelta(delta), pctStr, qualifier: null, color: delta >= 0 ? '#22c55e' : '#ef4444' };
}
function calcEpsChange(upEps: number | null, latestActual: number | null): EstChange | null {
  if (upEps == null || !isFinite(upEps) || latestActual == null || !isFinite(latestActual)) return null;
  const delta = upEps - latestActual;
  const amtStr = fmtEpsDelta(delta);
  const color = delta >= 0 ? '#22c55e' : '#ef4444';
  if (latestActual === 0)              return { amtStr, pctStr: null, qualifier: 'Percentage N/M', color };
  if (latestActual < 0 && upEps >= 0) return { amtStr, pctStr: null, qualifier: 'Turned Profitable', color };
  if (latestActual > 0 && upEps < 0)  return { amtStr, pctStr: null, qualifier: 'Turned to a Loss', color };
  if (latestActual < 0 && upEps < 0)  return { amtStr, pctStr: null, qualifier: upEps > latestActual ? 'Loss Narrowing' : 'Loss Widening', color };
  return { amtStr, pctStr: fmtPct(((upEps / latestActual) - 1) * 100), qualifier: null, color };
}

function consensusCol(label: string): string {
  const l = (label || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (l.includes('BUY')) return '#22c55e';
  if (l.includes('HOLD') || l.includes('NEUTRAL')) return '#f59e0b';
  if (l.includes('SELL')) return '#ef4444';
  return '#a9aaa6';
}

/* ── pre/post pattern ────────────────────────────────────────── */
function prePostPattern(pre: number | null, post: number | null): string {
  if (pre == null || post == null) return 'Unavailable';
  const THRESH = 0.05;
  if (Math.abs(pre) <= THRESH || Math.abs(post) <= THRESH) return 'Flat';
  if ((pre > 0) === (post > 0)) return 'Continuation';
  return 'Reversal';
}
function patternCol(p: string, C: any): string {
  if (p === 'Continuation') return C.green;
  if (p === 'Reversal') return C.red;
  if (p === 'Flat') return C.amber;
  return C.dim;
}

/* ── materials label maps ────────────────────────────────────── */
const CLASSIFICATION_LABEL: Record<string, string> = {
  primary_filing: 'Primary Filing',
  earnings_release: 'Earnings Release',
  investor_presentation: 'Investor Presentation',
  supplemental_tables: 'Supplemental Tables',
  corporate_guidance: 'Corporate Guidance',
  prepared_remarks: 'Prepared Remarks',
  transcript: 'Transcript',
  webcast_or_replay: 'Webcast / Replay',
  financial_report: 'Financial Report',
  insider_filing: 'Insider Filing',
  ownership_filing: 'Ownership Filing',
  offering_document: 'Offering Document',
  proxy: 'Proxy Statement',
  transaction_material: 'Transaction Material',
  other: 'Other Material',
};

const TRANSCRIPT_LABEL: Record<TranscriptStatusType, string> = {
  available_official: 'Official transcript available',
  available_sec_exhibit: 'Transcript available in SEC filing',
  available_licensed: 'Licensed transcript available',
  processing: 'Transcript processing',
  not_yet_available: 'Transcript not yet available',
  unavailable: 'Transcript unavailable',
  unknown: 'Transcript availability unknown',
};

const TRANSCRIPT_COL: Record<TranscriptStatusType, string> = {
  available_official: '#22c55e',
  available_sec_exhibit: '#22c55e',
  available_licensed: '#22c55e',
  processing: '#f59e0b',
  not_yet_available: '#f59e0b',
  unavailable: '#a9aaa6',
  unknown: '#a9aaa6',
};

const CATEGORY_LABEL: Record<string, string> = {
  current_reports: 'Current Reports',
  insider: 'Insider',
  earnings: 'Earnings',
  financial_reports: 'Financial Reports',
  ownership: 'Ownership',
  offerings: 'Offerings',
  governance: 'Governance',
  transactions: 'Transactions',
};

/* ── primitive components ─────────────────────────────────────── */
function SecLabel({ text, C }: { text: string; C: any }) {
  return <div style={{ fontSize: 8, fontWeight: 800, color: C.teal, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{text}</div>;
}
function GCard({ children, C, style }: { children: React.ReactNode; C: any; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, ...style }}>
      {children}
    </div>
  );
}
function Empty({ msg, C }: { msg: string; C: any }) {
  return <div style={{ padding: '28px 0', textAlign: 'center', color: C.dim, fontSize: 11, fontFamily: _s }}>{msg}</div>;
}
function KV({ k, v, vc }: { k: string; v: string; vc?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 9, color: '#a9aaa6', fontFamily: _f }}>{k}</span>
      <span style={{ fontSize: 9, color: vc ?? '#f5f5f0', fontWeight: 700, fontFamily: _f }}>{v}</span>
    </div>
  );
}
function RangeBtn({ label, active, onClick, C }: { label: string; active: boolean; onClick: () => void; C: any }) {
  return (
    <button onClick={onClick}
      style={{ padding: '3px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _f, cursor: 'pointer',
        background: active ? C.teal : 'transparent', color: active ? '#000' : C.dim, border: `1px solid ${active ? C.teal : C.border}` }}>
      {label}
    </button>
  );
}

/* ── sub-tab types ────────────────────────────────────────────── */
type SubTab = 'overview' | 'history' | 'price-moves' | 'ratings' | 'materials';
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview',    label: 'Overview' },
  { id: 'history',     label: 'History' },
  { id: 'price-moves', label: 'Price Moves' },
  { id: 'ratings',     label: 'Ratings' },
  { id: 'materials',   label: 'Materials' },
];

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW SUB-TAB — helpers, unified bubble, main function
   ═══════════════════════════════════════════════════════════════ */

/* State rank: higher number wins when selecting between live events */
const STATE_RANK: Record<string, number> = {
  complete: 7, results_updated: 6, results_available: 5,
  results_partial: 4, filing_detected: 3, monitoring: 2, scheduled: 1,
};

/* Match a LiveEarningsEvent and an EarningsQuarter as the same reporting event */
function isSameEvent(ev: LiveEarningsEvent, q: EarningsQuarter): boolean {
  if (ev.fiscal_year && ev.fiscal_period && q.fiscal_year && q.fiscal_period) {
    if (
      String(ev.fiscal_year) === String(q.fiscal_year) &&
      ev.fiscal_period.toUpperCase().trim() === (q.fiscal_period ?? '').toUpperCase().trim()
    ) return true;
  }
  const d1 = ev.expected_date ?? null;
  const d2 = q.date ?? null;
  if (d1 && d2) {
    const diff = Math.abs(
      new Date(d1 + 'T00:00:00Z').getTime() - new Date(d2 + 'T00:00:00Z').getTime()
    );
    if (diff <= 3 * 86_400_000) return true;
  }
  return false;
}

/* Derive classification from history row surprises when live_event omits it */
function deriveClassification(q: EarningsQuarter): 'double_beat' | 'double_miss' | 'mixed' | null {
  const epsBeat = q.eps_surprise_pct != null && q.eps_surprise_pct > 2;
  const revBeat = q.revenue_surprise_pct != null && q.revenue_surprise_pct > 2;
  const epsMiss = q.eps_surprise_pct != null && q.eps_surprise_pct < -2;
  const revMiss = q.revenue_surprise_pct != null && q.revenue_surprise_pct < -2;
  if (epsBeat && revBeat) return 'double_beat';
  if (epsMiss && revMiss) return 'double_miss';
  if ((epsBeat || revBeat) && (epsMiss || revMiss)) return 'mixed';
  return null;
}

/* Countdown hook — safe to call unconditionally at top of any component */
function useLocalCountdown(expectedAt: string | null | undefined): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expectedAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [expectedAt]);
  if (!expectedAt) return null;
  const diff = new Date(expectedAt).getTime() - now;
  if (diff <= 0) return null;
  const totalMins = Math.ceil(diff / 60_000);
  if (totalMins < 60) return `in ${totalMins}m`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `in ${hrs}h ${mins}m` : `in ${hrs}h`;
}
function fmtStaticCountdown(expectedDate: string | null, expectedAt: string | null): string | null {
  const target = expectedAt
    ? new Date(expectedAt)
    : expectedDate ? new Date(expectedDate + 'T20:00:00Z') : null;
  if (!target || isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  const mins2 = Math.ceil(diff / 60_000);
  if (mins2 < 60) return `in ${mins2}m`;
  const hrs2 = Math.floor(mins2 / 60);
  if (hrs2 < 48) { const rem = mins2 % 60; return rem > 0 ? `in ${hrs2}h ${rem}m` : `in ${hrs2}h`; }
  return `in ${Math.floor(hrs2 / 24)} days`;
}
function fmtTimingFull(t: string | null | undefined): { label: string; confirmed: boolean } {
  if (!t) return { label: 'Timing unconfirmed', confirmed: false };
  const l = t.toLowerCase();
  if (l === 'bmo' || l.includes('before')) return { label: 'Before Market Open', confirmed: true };
  if (l === 'amc' || l.includes('after'))  return { label: 'After Market Close',  confirmed: true };
  if (l.includes('during'))                return { label: 'During Market Hours',  confirmed: true };
  return { label: 'Timing unconfirmed', confirmed: false };
}
function fmtEpsEst(v: number | null): string {
  if (v == null || !isFinite(v)) return '—';
  return v < 0 ? `-$${Math.abs(v).toFixed(2)}` : `$${v.toFixed(2)}`;
}

/* ── 30-day recency window (NY timezone, date-only, no drift) ─── */
function todayNY_ET(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
function isWithin30DayWindow(reportDate: string | null): boolean {
  if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return false;
  const today = todayNY_ET();
  const [ty, tm, td] = today.split('-').map(Number);
  const [ry, rm, rd] = reportDate.split('-').map(Number);
  const todayMs  = Date.UTC(ty, tm - 1, td);
  const reportMs = Date.UTC(ry, rm - 1, rd);
  const diffDays = Math.floor((todayMs - reportMs) / 86_400_000);
  return diffDays >= 0 && diffDays <= 30;
}

/* ── Canonical upcoming event from earningsEntry ─────────────── */
function entryIsoDate(entry: any): string | null {
  if (!entry) return null;
  for (const f of ['earnings_date', 'date_raw', 'report_date', 'next_earnings_date']) {
    const v = (entry as Record<string, unknown>)[f];
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  }
  const nd = entry.next_date as string | null | undefined;
  if (!nd) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(nd)) return nd;
  try {
    const withYr = /\d{4}/.test(nd) ? nd : `${nd}, ${new Date().getFullYear()}`;
    const d = new Date(withYr);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  } catch { /* ignore */ }
  return null;
}
function entryToSyntheticEvent(entry: any, sym: string): LiveEarningsEvent | null {
  const isoDate = entryIsoDate(entry);
  if (!isoDate) return null;
  if (isoDate <= todayNY_ET()) return null;
  return {
    event_id: `wl-entry-${sym}`,
    event_key: `${sym.toUpperCase()}-wl`,
    symbol: sym.toUpperCase(),
    state: 'scheduled',
    classification: null,
    revision: 0,
    detected_at: null,
    updated_at: new Date().toISOString(),
    expected_date: isoDate,
    expected_at: null,
    expected_timing: (entry.timing ?? entry.when ?? null) as string | null,
    report_time_status: null,
    fiscal_period: null,
    fiscal_year: null,
    results_summary: {
      eps_actual: null,
      eps_estimate: (entry.est_eps ?? entry.eps_estimate ?? null) as number | null,
      eps_surprise_amount: null,
      eps_surprise_pct: null,
      revenue_actual: null,
      revenue_estimate: (entry.revenue_estimated ?? entry.revenue_estimate ?? null) as number | null,
      revenue_surprise_amount: null,
      revenue_surprise_pct: null,
    },
    filing_summary: null,
    initial_market_reaction: null,
  };
}

/* ── Unified Current Earnings Bubble ─────────────────────────── */
interface UnifiedBubbleProps {
  q: EarningsQuarter;
  liveEvent: LiveEarningsEvent | null;
  effectiveState: string;
  classification: string | null;
  treatAsReported: boolean;
  epsActual: number | null; epsEstimate: number | null;
  epsSurpriseAmt: number | null; epsSurprisePct: number | null;
  revActual: number | null; revEstimate: number | null;
  revSurpriseAmt: number | null; revSurprisePct: number | null;
  liveReaction: { move_pct?: number | null; session?: string | null; is_preliminary?: boolean } | null;
  hasPrePost: boolean; prePostIsUnavail: boolean;
  pr: PriceReaction | null;
  mat: LatestEarningsPacket | null;
  onSwitchToMaterials?: () => void;
  C: any;
}

function UnifiedEarningsBubble({
  q, liveEvent, effectiveState, classification,
  epsActual, epsEstimate, epsSurpriseAmt, epsSurprisePct,
  revActual, revEstimate, revSurpriseAmt, revSurprisePct,
  liveReaction, pr, mat, onSwitchToMaterials, C,
}: UnifiedBubbleProps) {
  const countdown = useLocalCountdown(liveEvent?.expected_at);

  useMemo(() => {
    if (typeof document === 'undefined' || document.getElementById('lec-styles')) return;
    const s = document.createElement('style');
    s.id = 'lec-styles';
    s.textContent = '@keyframes lec-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}';
    document.head.appendChild(s);
  }, []);

  const isReported = effectiveState === 'results_available' || effectiveState === 'results_updated' || effectiveState === 'complete';
  const isPartial  = effectiveState === 'results_partial';
  const isFiling   = effectiveState === 'filing_detected';
  const isMonitor  = effectiveState === 'monitoring';
  const isUpcoming = effectiveState === 'scheduled';
  const isPending  = isMonitor || isFiling;

  let leftLabel: string, statusColor: string, bubbleBg: string, bubbleBorder: string;

  if (isReported || isPartial) {
    if (classification === 'double_beat') {
      leftLabel = 'Positive Results'; statusColor = '#22c55e';
      bubbleBg = 'rgba(34,197,94,0.06)'; bubbleBorder = 'rgba(34,197,94,0.35)';
    } else if (classification === 'double_miss') {
      leftLabel = 'Negative Results'; statusColor = '#ef4444';
      bubbleBg = 'rgba(239,68,68,0.06)'; bubbleBorder = 'rgba(239,68,68,0.35)';
    } else if (classification === 'mixed') {
      leftLabel = 'Mixed Results'; statusColor = '#f59e0b';
      bubbleBg = 'rgba(245,158,11,0.06)'; bubbleBorder = 'rgba(245,158,11,0.35)';
    } else if (isPartial) {
      leftLabel = 'Partial Results'; statusColor = '#f59e0b';
      bubbleBg = 'rgba(245,158,11,0.06)'; bubbleBorder = 'rgba(245,158,11,0.35)';
    } else {
      leftLabel = 'Results Reported'; statusColor = C.teal;
      bubbleBg = 'rgba(14,165,233,0.05)'; bubbleBorder = 'rgba(14,165,233,0.28)';
    }
  } else if (isFiling) {
    leftLabel = 'Release Detected'; statusColor = '#f59e0b';
    bubbleBg = 'rgba(245,158,11,0.06)'; bubbleBorder = 'rgba(245,158,11,0.38)';
  } else if (isMonitor) {
    leftLabel = 'Awaiting Results'; statusColor = '#f59e0b';
    bubbleBg = 'rgba(245,158,11,0.04)'; bubbleBorder = 'rgba(245,158,11,0.25)';
  } else {
    leftLabel = 'Upcoming'; statusColor = C.dim;
    bubbleBg = 'rgba(255,255,255,0.02)'; bubbleBorder = 'rgba(255,255,255,0.10)';
  }

  const classLabel =
    classification === 'double_beat' ? 'Double Beat' :
    classification === 'double_miss' ? 'Double Miss' :
    classification === 'mixed'       ? 'Mixed' :
    classification === 'partial'     ? 'Partial' : null;

  // Sub-label for unclassified: "Estimates unavailable" shown in left header segment
  const hasEstimates = revEstimate != null || epsEstimate != null;
  const classSubLabel = isReported && !hasEstimates && (classification === 'unclassified' || classification == null)
    ? 'Estimates unavailable' : null;

  const liveMovePct      = (liveReaction as any)?.move_pct as number | null ?? null;
  const liveMoveSession  = (liveReaction as any)?.session  as string | null ?? null;
  const liveMovePrelim   = !!(liveReaction as any)?.is_preliminary;
  // Primary: finalized post_earnings_1d_pct; secondary: live move_pct; fallback: reaction_1d_pct
  const postEarnings1d   = pr?.post_earnings_1d_pct ?? null;
  const fallbackMove     = (postEarnings1d == null && liveMovePct == null && isReported) ? (pr?.reaction_1d_pct ?? null) : null;
  const displayMove      = postEarnings1d ?? liveMovePct ?? fallbackMove;
  // Only show preliminary label when using live move (not when post_earnings_1d_pct is finalized)
  const showPrelimLabel  = postEarnings1d == null && liveMovePrelim && displayMove != null;
  const moveSessionLabel =
    postEarnings1d != null && pr?.post_earnings_session
      ? pr.post_earnings_session
      : liveMoveSession === 'premarket'  ? 'Premarket'
      : liveMoveSession === 'afterhours' ? 'After Hours'
      : liveMoveSession === 'regular'    ? 'Regular'
      : null;

  const quarterLabel = (q.fiscal_period && q.fiscal_year)
    ? `${q.fiscal_period} ${q.fiscal_year} Earnings`
    : 'Current Quarter Earnings';
  const timingBadge = (q.timing && q.timing !== 'unknown') ? (TIMING_BADGE[q.timing] ?? null) : null;
  const timingFull  = (q.timing && q.timing !== 'unknown') ? (TIMING_FULL[q.timing]  ?? null) : null;
  const isConfirmed = q.timing_confidence === 'confirmed';

  const epsSpShowPct = epsSurprisePct != null && Math.abs(epsSurprisePct) < 600;

  const preOk         = pr?.pre_earnings_1d_pct  != null;
  const postOk        = pr?.post_earnings_1d_pct != null;
  const prePostUnavail = !!(pr?.pre_post_method?.includes('unavailable'));
  // Treat reaction as final if post_earnings_1d_pct is populated — presence of the
  // finalized value is the authoritative signal, regardless of the reactions_final flag.
  const isPrelimReaction = pr != null && !pr.reactions_final && pr.post_earnings_1d_pct == null;

  const filingUrl  = liveEvent?.filing_payload?.url ?? liveEvent?.filing_summary?.url ?? mat?.primary_filing?.filing_index_url ?? null;
  const releaseUrl = mat?.earnings_release?.document_url ?? null;
  const presentUrl = mat?.investor_presentation?.document_url ?? null;
  const webcastUrl = mat?.webcast_url ?? null;
  const hasAnyAction = !!(filingUrl || releaseUrl || presentUrl || webcastUrl || onSwitchToMaterials);

  const abtn = (primary: boolean): React.CSSProperties => ({
    fontSize: 9, fontWeight: 700, fontFamily: _f, letterSpacing: '0.05em',
    textTransform: 'uppercase' as const, padding: '5px 12px', borderRadius: 4,
    cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
    color: primary ? statusColor : C.dim,
    background: primary ? `${statusColor}12` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${primary ? `${statusColor}40` : 'rgba(255,255,255,0.10)'}`,
  });

  return (
    <div style={{ background: bubbleBg, border: `1px solid ${bubbleBorder}`, borderRadius: 8, overflow: 'hidden' }}>

      {/* ── Header strip ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${bubbleBorder}`, flexWrap: 'wrap' as const, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {isPending && (
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: statusColor, animation: 'lec-pulse 1.8s ease-in-out infinite', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 11, fontWeight: 800, fontFamily: _f, color: statusColor, letterSpacing: '0.07em', textTransform: 'uppercase' as const }}>{leftLabel}</span>
          {classLabel && (
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: statusColor, opacity: 0.8 }}>{classLabel}</span>
          )}
          {classSubLabel && (
            <span style={{ fontSize: 9, fontWeight: 600, fontFamily: _f, color: C.dim }}>{classSubLabel}</span>
          )}
        </div>
        <div style={{ textAlign: 'right' as const }}>
          {displayMove != null ? (
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 8, fontWeight: 800, fontFamily: _f, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: displayMove > 0 ? '#22c55e' : displayMove < 0 ? '#ef4444' : C.dim }}>
                {displayMove > 0 ? 'POSITIVE MOVE' : displayMove < 0 ? 'NEGATIVE MOVE' : 'FLAT MOVE'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 900, fontFamily: _f, color: displayMove > 0 ? '#22c55e' : displayMove < 0 ? '#ef4444' : C.dim }}>
                  {displayMove > 0 ? '+' : ''}{displayMove.toFixed(2)}%
                </span>
                {moveSessionLabel && <span style={{ fontSize: 9, color: C.dim, fontFamily: _s }}>{moveSessionLabel}</span>}
                {showPrelimLabel && <span style={{ fontSize: 8, fontWeight: 700, fontFamily: _f, color: C.amber, border: `1px solid ${C.amber}40`, padding: '1px 4px', borderRadius: 2 }}>~</span>}
              </div>
              {showPrelimLabel && <div style={{ fontSize: 8, color: C.dim, fontFamily: _s }}>Price Reaction Preliminary</div>}
            </div>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.dim, letterSpacing: '0.06em' }}>
              {(isReported || isPartial) ? 'PRICE REACTION PENDING' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Quarter info ──────────────────────────────────────── */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${bubbleBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: _f, color: C.bright }}>{quarterLabel}</span>
          {q.date && <span style={{ fontSize: 10, color: C.dim, fontFamily: _s }}>{fmtDateShort(q.date)}</span>}
          {timingBadge && (
            <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _f, color: '#000', background: '#0ea5e9' }}>
              {timingBadge}
            </span>
          )}
          {isConfirmed && timingBadge && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: _s }}>Confirmed</span>
          )}
          {(isUpcoming || isMonitor) && countdown && (
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: _f, color: '#f59e0b' }}>Reports {countdown}</span>
          )}
        </div>
        {timingFull && (
          <div style={{ fontSize: 10, color: C.dim, fontFamily: _s, marginTop: 4 }}>{timingFull}</div>
        )}
      </div>

      {/* ── Revenue + EPS rows ────────────────────────────────── */}
      {(isReported || isPartial) && (
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${bubbleBorder}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              label: 'Revenue',
              actual: fmtRev(revActual), estimate: revEstimate != null ? fmtRev(revEstimate) : null,
              surpriseAmt: revSurpriseAmt != null ? fmtRev(revSurpriseAmt) : null,
              surprisePct: revSurprisePct, showPct: true,
            },
            {
              label: 'EPS',
              actual: fmtEps(epsActual), estimate: epsEstimate != null ? fmtEps(epsEstimate) : null,
              surpriseAmt: epsSurpriseAmt != null ? fmtEps(epsSurpriseAmt) : null,
              surprisePct: epsSurprisePct, showPct: epsSpShowPct,
            },
          ].map(({ label, actual, estimate, surpriseAmt, surprisePct, showPct }) => (
            <div key={label}>
              <div style={{ fontSize: 8, fontWeight: 800, color: C.teal, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 5 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: C.bright, fontFamily: _f }}>{actual}</span>
                {estimate != null && <span style={{ fontSize: 9, color: C.dim, fontFamily: _f }}>est. {estimate}</span>}
              </div>
              {estimate != null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' as const }}>
                  {surpriseAmt && <span style={{ fontSize: 11, fontWeight: 800, fontFamily: _f, color: surpriseCol(surprisePct, C) }}>{surpriseAmt}</span>}
                  {showPct && surprisePct != null && <span style={{ fontSize: 10, color: surpriseCol(surprisePct, C), fontFamily: _f }}>({fmtPct(surprisePct)})</span>}
                  {surpriseLabel(surprisePct) && (
                    <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 8, fontWeight: 800, fontFamily: _f, color: '#000', background: surpriseCol(surprisePct, C) }}>
                      {surpriseLabel(surprisePct)}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 3 }}>Estimate unavailable</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Before / After Earnings ──────────────────────────── */}
      {isReported && (
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${bubbleBorder}` }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: C.teal, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 8 }}>Before vs After Earnings</div>
          {!prePostUnavail ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Before Earnings', val: preOk  ? pr!.pre_earnings_1d_pct  : null, session: pr?.pre_earnings_session  ?? null },
                { label: 'After Earnings',  val: postOk ? pr!.post_earnings_1d_pct : null, session: pr?.post_earnings_session ?? null },
              ].map(({ label, val, session }) => (
                <div key={label} style={{ textAlign: 'center' as const, padding: '4px 0' }}>
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                  {val != null ? (
                    <>
                      <div style={{ fontSize: 20, fontWeight: 900, fontFamily: _f, color: pctCol(val, C) }}>{fmtPct(val)}</div>
                      {session && <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 2 }}>{fmtDateShort(session)}</div>}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: C.dim }}>Move Pending</div>
                      <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>Available after the first complete post-earnings trading session</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: C.dim, textAlign: 'center' as const }}>Move Pending</div>
              <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2, textAlign: 'center' as const }}>Available after the first complete post-earnings trading session</div>
            </>
          )}
          {isPrelimReaction && (
            <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 6 }}>Price Reaction Preliminary</div>
          )}
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────── */}
      {hasAnyAction && (
        <div style={{ padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          {filingUrl  && <a href={filingUrl}  target="_blank" rel="noopener noreferrer" style={abtn(true)  as React.CSSProperties}>Open Filing</a>}
          {releaseUrl && <a href={releaseUrl} target="_blank" rel="noopener noreferrer" style={abtn(false) as React.CSSProperties}>Earnings Release</a>}
          {presentUrl && <a href={presentUrl} target="_blank" rel="noopener noreferrer" style={abtn(false) as React.CSSProperties}>Presentation</a>}
          {webcastUrl && <a href={webcastUrl} target="_blank" rel="noopener noreferrer" style={abtn(false) as React.CSSProperties}>Webcast</a>}
          {onSwitchToMaterials && (
            <button onClick={onSwitchToMaterials} style={abtn(false) as React.CSSProperties}>All Materials →</button>
          )}
        </div>
      )}
    </div>
  );
}

function OverviewSubTab({ ei, C, ticker, onSwitchToMaterials, earningsEntry }: {
  ei: EarningsIntelligence; C: any; ticker?: string; onSwitchToMaterials?: () => void; earningsEntry?: any;
}) {
  const { eventBySymbol } = useEarningsLive();

  const feedEvent = ticker ? eventBySymbol(ticker) : null;
  const detailEvent: LiveEarningsEvent | null = (ei.live_event ?? null) as LiveEarningsEvent | null;

  /* Best live event: state rank takes priority over timestamp */
  const liveEvent = useMemo((): LiveEarningsEvent | null => {
    if (!feedEvent && !detailEvent) return null;
    if (!feedEvent) return detailEvent;
    if (!detailEvent) return feedEvent;
    const feedRank   = STATE_RANK[feedEvent.state]   ?? 0;
    const detailRank = STATE_RANK[detailEvent.state] ?? 0;
    if (feedRank !== detailRank) return feedRank > detailRank ? feedEvent : detailEvent;
    if (feedEvent.revision !== detailEvent.revision) {
      return feedEvent.revision > detailEvent.revision ? feedEvent : detailEvent;
    }
    return new Date(feedEvent.updated_at) >= new Date(detailEvent.updated_at) ? feedEvent : detailEvent;
  }, [feedEvent, detailEvent]);

  /* Canonical upcoming event: scheduled/monitoring liveEvent (future) wins, earningsEntry as fallback.
     Estimates are enriched from earningsEntry when liveEvent.results_summary is missing them. */
  const upcomingLive = useMemo((): LiveEarningsEvent | null => {
    const today = todayNY_ET();
    if (liveEvent &&
        (liveEvent.state === 'scheduled' || liveEvent.state === 'monitoring') &&
        liveEvent.expected_date && liveEvent.expected_date > today) {
      const rs0 = liveEvent.results_summary;
      const epsEst = rs0?.eps_estimate ?? (earningsEntry?.est_eps ?? earningsEntry?.eps_estimate ?? null) as number | null;
      const revEst = rs0?.revenue_estimate ?? (earningsEntry?.revenue_estimated ?? earningsEntry?.revenue_estimate ?? null) as number | null;
      if (epsEst === rs0?.eps_estimate && revEst === rs0?.revenue_estimate) return liveEvent;
      return {
        ...liveEvent,
        results_summary: {
          eps_actual: rs0?.eps_actual ?? null,
          eps_estimate: epsEst,
          eps_surprise_amount: rs0?.eps_surprise_amount ?? null,
          eps_surprise_pct: rs0?.eps_surprise_pct ?? null,
          revenue_actual: rs0?.revenue_actual ?? null,
          revenue_estimate: revEst,
          revenue_surprise_amount: rs0?.revenue_surprise_amount ?? null,
          revenue_surprise_pct: rs0?.revenue_surprise_pct ?? null,
        },
      };
    }
    return earningsEntry ? entryToSyntheticEvent(earningsEntry, ticker ?? '') : null;
  }, [liveEvent, earningsEntry, ticker]);

  const cov = ei.source_status.coverage;
  const hist = ei.earnings_history;
  const rs = ei.reaction_summary;
  const hasHistory = cov.has_earnings_history && hist.length > 0;

  if (!hasHistory && !liveEvent && !upcomingLive) {
    return <Empty msg="Historical earnings data is not available from the current provider." C={C} />;
  }

  if (!hasHistory) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LiveEarningsCard event={(upcomingLive ?? liveEvent)!} onOpenMaterials={onSwitchToMaterials} />
      </div>
    );
  }

  const q = hist[0];
  const pr = q.price_reaction;

  /* Same event? */
  const isSameQ = liveEvent != null && isSameEvent(liveEvent, q);

  /* Defensive: hist[0] has actuals but live is still scheduled → treat as reported */
  const hasActuals = q.eps_actual != null || q.revenue_actual != null;
  const treatAsReported = isSameQ && hasActuals && (!liveEvent || liveEvent.state === 'scheduled');
  const effectiveState  = treatAsReported ? 'results_available' : (liveEvent?.state ?? 'complete');

  /* Classification: live event wins, then derive from history */
  const classification = liveEvent?.classification ?? (hasActuals ? deriveClassification(q) : null);

  /* Merged data: live (immediate) + history (persisted/detailed) */
  const liveRs = liveEvent
    ? ((liveEvent.results_payload ?? liveEvent.results_summary) as any)
    : null;

  const epsActual   = liveRs?.eps_actual              ?? q.eps_actual;
  const epsEstimate = q.eps_estimate                  ?? liveRs?.eps_estimate;
  const epsSurpAmt  = q.eps_surprise_amount           ?? liveRs?.eps_surprise_amount;
  const epsSurpPct  = q.eps_surprise_pct              ?? liveRs?.eps_surprise_pct;

  const revActual   = liveRs?.revenue_actual          ?? q.revenue_actual;
  const revEstimate = q.revenue_estimate              ?? liveRs?.revenue_estimate;
  const revSurpAmt  = q.revenue_surprise_amount       ?? liveRs?.revenue_surprise_amount;
  const revSurpPct  = q.revenue_surprise_pct          ?? liveRs?.revenue_surprise_pct;

  const liveReaction = liveEvent
    ? ((liveEvent.reaction_payload ?? liveEvent.initial_market_reaction) as any)
    : null;

  const mat = ei.materials?.latest_earnings_packet ?? null;

  const hasPrePost     = pr != null && (pr.pre_earnings_1d_pct != null || pr.post_earnings_1d_pct != null);
  const prePostIsUnavail = !!(pr?.pre_post_method?.includes('unavailable'));

  const isInferred = q.timing_confidence === 'inferred_low';
  const isApprox   = !!(pr?.calculation_method?.includes('inferred'));
  const hasPriceReaction = pr != null && (
    pr.opening_gap_pct != null || pr.reaction_1d_pct != null ||
    pr.reaction_3d_pct != null || pr.reaction_5d_pct != null
  );

  /* 30-day rule: was the latest reported quarter within 30 days? */
  const isRecentReport = isWithin30DayWindow(q.date);

  /* ── Upcoming Earnings card: schedule + estimate bubbles ─────── */
  const renderUpcomingCard = (ev: LiveEarningsEvent) => {
    const upEps    = ev.results_summary?.eps_estimate ?? null;
    const upRev    = ev.results_summary?.revenue_estimate ?? null;
    const timing    = fmtTimingFull(ev.expected_timing);
    const countdown = fmtStaticCountdown(ev.expected_date, ev.expected_at ?? null);
    const quarterLabel = ev.fiscal_period && ev.fiscal_year ? `${ev.fiscal_period} ${ev.fiscal_year}` : null;

    /* Compare against latest reported actual (hist[0] = q, already in scope) */
    const latestRevActual = q.revenue_actual;
    const latestEpsActual = q.eps_actual;
    const revChg = calcRevChange(upRev, latestRevActual);
    const epsChg = calcEpsChange(upEps, latestEpsActual);

    const estBubble = (
      title: string,
      val: string,
      latestActualStr: string,
      chg: EstChange | null,
    ) => (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 5 }}>{title}</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: val === '—' ? C.dim : C.bright, fontFamily: _f }}>{val}</div>
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 2 }}>Latest Reported</div>
          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: _f, color: C.dim }}>{latestActualStr}</div>
        </div>
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 2 }}>Expected Change</div>
          {chg ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: chg.color }}>
                {chg.pctStr ? `${chg.amtStr} (${chg.pctStr})` : chg.amtStr}
              </div>
              {chg.qualifier && (
                <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 1 }}>{chg.qualifier}</div>
              )}
              <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>vs latest reported quarter</div>
            </>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: C.dim }}>—</div>
          )}
        </div>
      </div>
    );

    return (
      <div style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.18)', borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: 12, alignItems: 'start' }}>
          {/* Col 1: Schedule */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 5 }}>Schedule</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: ev.expected_date ? C.bright : C.dim, fontFamily: _f, lineHeight: '1.1' }}>
              {ev.expected_date ? fmtDate(ev.expected_date) : '—'}
            </div>
            {quarterLabel && <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 3 }}>{quarterLabel}</div>}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 10, color: C.text, fontFamily: _s, marginBottom: 2 }}>{timing.label}</div>
              {ev.report_time_status === 'confirmed'
                ? <span style={{ fontSize: 8, fontWeight: 700, fontFamily: _f, color: C.teal, letterSpacing: '0.06em' }}>✓ Confirmed</span>
                : <span style={{ fontSize: 8, color: C.dim, fontFamily: _s }}>Estimated report time</span>
              }
            </div>
            {countdown && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 8, fontWeight: 800, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 3 }}>Reports in</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: C.amber, fontFamily: _f }}>{countdown}</div>
              </div>
            )}
          </div>
          {/* Col 2: Revenue Estimate */}
          {estBubble('Revenue Estimate', upRev != null ? fmtRev(upRev) : '—', fmtRev(latestRevActual), revChg)}
          {/* Col 3: EPS Estimate */}
          {estBubble('EPS Estimate', fmtEpsEst(upEps), fmtEpsEst(latestEpsActual), epsChg)}
        </div>
      </div>
    );
  };

  /* ── Latest Earnings card: results + reaction + context panels ── */
  const renderReportedCard = () => (
    <GCard C={C}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: C.bright, fontFamily: _f }}>
          {q.fiscal_period && q.fiscal_year ? `${q.fiscal_period} ${q.fiscal_year}` : fmtDate(q.date)}
        </span>
        {q.date && <span style={{ fontSize: 10, color: C.dim, fontFamily: _s }}>{fmtDate(q.date)}</span>}
        {q.timing && (
          <span title={TIMING_FULL[q.timing] ?? q.timing}
            style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _f,
              color: q.timing === 'unknown' ? C.dim : '#000',
              background: q.timing === 'unknown' ? 'transparent' : '#0ea5e9',
              border: q.timing === 'unknown' ? `1px solid ${C.border}` : 'none' }}>
            {TIMING_BADGE[q.timing] ?? q.timing.toUpperCase()}
          </span>
        )}
        {pr && !pr.reactions_final && (
          <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.amber, border: `1px solid ${C.amber}50` }}>PRELIMINARY</span>
        )}
        <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.green, border: `1px solid ${C.green}40` }}>REPORTED</span>
      </div>
      {isInferred && <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 5 }}>ⓘ Timing inferred from available filing metadata</div>}

      {/* Revenue + EPS result bubbles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        {[
          { title: 'Revenue', actual: fmtRev(q.revenue_actual), estimate: q.revenue_estimate != null ? fmtRev(q.revenue_estimate) : null, surpriseAmt: q.revenue_surprise_amount != null ? fmtRevDelta(q.revenue_surprise_amount) : '—', surprisePct: q.revenue_surprise_pct, showPct: true },
          { title: 'EPS', actual: fmtEps(q.eps_actual), estimate: q.eps_estimate != null ? fmtEps(q.eps_estimate) : null, surpriseAmt: q.eps_surprise_amount != null ? fmtEpsDelta(q.eps_surprise_amount) : '—', surprisePct: q.eps_surprise_pct, showPct: q.eps_surprise_pct != null && Math.abs(q.eps_surprise_pct) < 600 },
        ].map(({ title, actual, estimate, surpriseAmt, surprisePct, showPct }) => (
          <div key={title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 5, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.bright, fontFamily: _f, marginBottom: 8 }}>{actual}</div>
            {estimate != null ? (
              <>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 2 }}>Estimate</div>
                  <div style={{ fontSize: 11, fontWeight: 600, fontFamily: _f, color: C.dim }}>{estimate}</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 3 }}>Surprise</div>
                  <div style={{ fontSize: 13, fontWeight: 800, fontFamily: _f, color: surpriseCol(surprisePct, C) }}>{surpriseAmt}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' as const }}>
                    {showPct && <span style={{ fontSize: 10, color: surpriseCol(surprisePct, C), fontFamily: _f }}>{fmtPct(surprisePct)}</span>}
                    {surpriseLabel(surprisePct) && (
                      <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 8, fontWeight: 800, fontFamily: _f, color: '#000', background: surpriseCol(surprisePct, C) }}>
                        {surpriseLabel(surprisePct)}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 4 }}>Estimate unavailable</div>
            )}
          </div>
        ))}
      </div>

      {/* Before vs After Earnings */}
      {hasPrePost && !prePostIsUnavail && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <SecLabel text="Before vs After Earnings" C={C} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            {[
              { label: 'Before Earnings', val: pr!.pre_earnings_1d_pct, session: pr!.pre_earnings_session },
              { label: 'After Earnings',  val: pr!.post_earnings_1d_pct, session: pr!.post_earnings_session },
            ].map(({ label, val, session }) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px 4px' }}>
                <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                {val != null ? (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 900, fontFamily: _f, color: pctCol(val, C) }}>{fmtPct(val)}</div>
                    {session && <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 3 }}>{fmtDate(session)}</div>}
                  </>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: _f, color: C.dim }}>—</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
            ⓘ {['Aligned to nearest regular-session closes', isInferred ? '· timing inferred from filing metadata' : ''].filter(Boolean).join(' ')}
          </div>
        </div>
      )}

      {/* Price Reaction — compact glass tile grid */}
      {hasPriceReaction && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <SecLabel text="Price Reaction" C={C} />
            {isApprox && <span style={{ fontSize: 8, color: C.dim, fontFamily: _s }}>close-to-close approx.</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {[
              { label: 'Opening Gap',  v: pr!.opening_gap_pct,      bold: false },
              { label: 'Post 1D',      v: pr!.reaction_1d_pct,      bold: true  },
              { label: '3-Day',        v: pr!.reaction_3d_pct,      bold: false },
              { label: '5-Day',        v: pr!.reaction_5d_pct,      bold: false },
              { label: 'Max Upside',   v: pr!.max_upside_5d_pct,    bold: false },
              { label: 'Max Drawdown', v: pr!.max_drawdown_5d_pct,  bold: false },
            ].map(({ label, v, bold }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,${bold ? '0.10' : '0.05'})`, borderRadius: 5, padding: '7px 8px', textAlign: 'center' as const }}>
                <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: bold ? 14 : 12, fontWeight: bold ? 900 : 700, fontFamily: _f, color: v != null ? pctCol(v, C) : C.dim }}>
                  {v != null ? fmtPct(v) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Growth Context + Historical Reaction — stacked */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Growth Context */}
        <div>
          <SecLabel text="Growth Context" C={C} />
          {(() => {
            const prevQ = hist[1] ?? null;
            const yoyQ = (q.fiscal_period && q.fiscal_year)
              ? (hist.find(h => h !== q && h.fiscal_period === q.fiscal_period && h.fiscal_year === String(Number(q.fiscal_year) - 1)) ?? null)
              : (hist[4] ?? null);

            const epsInfo = (g: EpsGrowth | null): { val: string; col: string } => {
              if (!g || !g.transition_type || g.transition_type === 'unavailable') return { val: '—', col: C.dim };
              const tt = g.transition_type;
              if ((tt === 'profit_increased' || tt === 'profit_decreased') && g.raw_growth_pct != null) {
                return { val: fmtPct(g.raw_growth_pct), col: pctCol(g.raw_growth_pct, C) };
              }
              const SM: Record<string, { val: string; col: string }> = {
                turned_profitable: { val: 'Turned Profitable', col: C.green },
                turned_negative:   { val: 'Turned to a Loss',  col: C.red   },
                loss_narrowed:     { val: 'Loss Narrowed',     col: C.green },
                loss_widened:      { val: 'Loss Widened',      col: C.red   },
                flat:              { val: 'Flat',              col: C.dim   },
                profit_increased:  { val: 'EPS Grew',          col: C.green },
                profit_decreased:  { val: 'EPS Declined',      col: C.red   },
              };
              return SM[tt] ?? { val: '—', col: C.dim };
            };

            const revArrow = (cur: number | null, cmp: number | null): string | null =>
              cur != null && cmp != null ? `${fmtRev(cmp)} → ${fmtRev(cur)}` : null;
            const epsSign = (v: number): string => v < 0 ? `-$${Math.abs(v).toFixed(2)}` : `$${v.toFixed(2)}`;
            const epsArrow = (cur: number | null, cmp: number | null): string | null =>
              cur != null && cmp != null ? `${epsSign(cmp)} → ${epsSign(cur)}` : null;

            const qoqEps = epsInfo(q.eps_qoq);
            const yoyEps = epsInfo(q.eps_yoy);

            const tiles: { label: string; val: string; col: string; arrow: string | null }[] = [
              { label: 'Revenue vs Previous Quarter', val: fmtPct(q.revenue_qoq_pct), col: pctCol(q.revenue_qoq_pct, C), arrow: revArrow(q.revenue_actual, prevQ?.revenue_actual ?? null) },
              { label: 'Revenue vs Year Ago',         val: fmtPct(q.revenue_yoy_pct), col: pctCol(q.revenue_yoy_pct, C), arrow: revArrow(q.revenue_actual, yoyQ?.revenue_actual ?? null) },
              { label: 'EPS vs Previous Quarter',     val: qoqEps.val, col: qoqEps.col, arrow: epsArrow(q.eps_actual, prevQ?.eps_actual ?? null) },
              { label: 'EPS vs Year Ago',             val: yoyEps.val, col: yoyEps.col, arrow: epsArrow(q.eps_actual, yoyQ?.eps_actual ?? null) },
            ];

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                {tiles.map(({ label, val, col, arrow }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, padding: '6px 8px' }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, lineHeight: '1.35' }}>{label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: col }}>{val || '—'}</div>
                    {arrow && (
                      <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 3 }}>{arrow}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
        {/* Historical Reaction */}
        {rs && cov.has_reactions && (
          <div>
            <div style={{ marginBottom: 6 }}>
              <SecLabel text="Historical Reaction" C={C} />
              {rs.observations_1d != null && (
                <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 3 }}>
                  Based on {rs.observations_1d} completed earnings events · First session after earnings
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {([
                { label: 'Average Post-Earnings Move',  val: fmtPct(rs.average_1d_pct),    sub: 'Mean first-session return',               col: pctCol(rs.average_1d_pct, C) },
                { label: 'Median Post-Earnings Move',   val: fmtPct(rs.median_1d_pct),     sub: 'Middle first-session return',             col: pctCol(rs.median_1d_pct, C) },
                { label: 'Average Absolute Move',       val: fmtPct(rs.average_absolute_1d_pct, false), sub: 'Typical move regardless of direction', col: C.text },
                { label: 'Positive Reaction Rate',      val: rs.positive_1d_rate != null ? `${rs.positive_1d_rate.toFixed(0)}%` : '—', sub: 'Share of reactions above 0%', col: rs.positive_1d_rate != null ? (rs.positive_1d_rate > 52 ? C.green : rs.positive_1d_rate < 48 ? C.red : C.text) : C.dim },
                { label: 'Best Post-Earnings Gain',     val: fmtPct(rs.largest_positive_1d_pct), sub: 'Strongest first-session gain',    col: pctCol(rs.largest_positive_1d_pct, C) },
                { label: 'Worst Post-Earnings Decline', val: fmtPct(rs.largest_negative_1d_pct), sub: 'Largest first-session loss',      col: pctCol(rs.largest_negative_1d_pct, C) },
              ] as Array<{ label: string; val: string; sub: string; col: string }>).map(({ label, val, sub, col }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, padding: '6px 8px' }}>
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, lineHeight: '1.35' }}>{label}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: col }}>{val || '—'}</div>
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 3 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GCard>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {!isRecentReport && upcomingLive ? (
        /* ── PATH A: Upcoming first (CGNX/GLW/NVTS pattern) ─────────────── */
        <>
          <div style={{ fontSize: 9, fontWeight: 800, color: C.teal, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>Upcoming Earnings</div>
          {renderUpcomingCard(upcomingLive)}
          <div style={{ fontSize: 9, fontWeight: 800, color: C.teal, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginTop: 2 }}>Latest Earnings</div>
          {renderReportedCard()}
        </>
      ) : isSameQ ? (
        /* ── PATH B: Same event (GOOGL pattern) — UnifiedBubble ─────────── */
        <>
          <UnifiedEarningsBubble
            q={q} liveEvent={liveEvent} effectiveState={effectiveState}
            classification={classification as any} treatAsReported={treatAsReported}
            epsActual={epsActual} epsEstimate={epsEstimate}
            epsSurpriseAmt={epsSurpAmt} epsSurprisePct={epsSurpPct}
            revActual={revActual} revEstimate={revEstimate}
            revSurpriseAmt={revSurpAmt} revSurprisePct={revSurpPct}
            liveReaction={liveReaction}
            hasPrePost={hasPrePost} prePostIsUnavail={prePostIsUnavail}
            pr={pr} mat={mat}
            onSwitchToMaterials={onSwitchToMaterials}
            C={C}
          />

          {/* Analyst Consensus for upcoming scheduled/monitoring state */}
          {!treatAsReported && (effectiveState === 'scheduled' || effectiveState === 'monitoring') && (() => {
            if (epsEstimate == null && revEstimate == null) return null;
            let epsG: { pct: number | null; label: string | null } = { pct: null, label: null };
            if (q.eps_yoy?.raw_growth_pct != null && isFinite(q.eps_yoy.raw_growth_pct)) {
              epsG = { pct: q.eps_yoy.raw_growth_pct, label: null };
            } else if (q.eps_yoy?.transition_type && q.eps_yoy.transition_type !== 'unavailable') {
              const tt = q.eps_yoy.transition_type;
              if      (tt === 'turned_profitable') epsG = { pct: null, label: 'Profit expected' };
              else if (tt === 'turned_negative')   epsG = { pct: null, label: 'Loss expected' };
              else if (tt === 'loss_narrowed')      epsG = { pct: null, label: 'Loss narrowing' };
              else if (tt === 'loss_widened')       epsG = { pct: null, label: 'Loss widening' };
            } else {
              const prYr = q.fiscal_year ? String(Number(q.fiscal_year) - 1) : null;
              const prQ  = (q.fiscal_period && prYr) ? hist.slice(1).find(h => h.fiscal_period === q.fiscal_period && h.fiscal_year === prYr) ?? null : null;
              epsG = calcExpectedGrowth(epsEstimate, prQ?.eps_actual ?? null);
            }
            let revGPct: number | null = q.revenue_yoy_pct != null && isFinite(q.revenue_yoy_pct) ? q.revenue_yoy_pct : null;
            if (revGPct == null) {
              const prYr = q.fiscal_year ? String(Number(q.fiscal_year) - 1) : null;
              const prQ  = (q.fiscal_period && prYr) ? hist.slice(1).find(h => h.fiscal_period === q.fiscal_period && h.fiscal_year === prYr) ?? null : null;
              if (prQ?.revenue_actual != null && revEstimate != null && isFinite(prQ.revenue_actual) && prQ.revenue_actual !== 0) {
                revGPct = ((revEstimate / prQ.revenue_actual) - 1) * 100;
              }
            }
            return (
              <GCard C={C}>
                <SecLabel text="Analyst Consensus" C={C} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 8 }}>
                  {[
                    { label: 'EPS Estimate',        val: epsEstimate != null ? fmtEps(epsEstimate) : '—', col: C.text },
                    { label: 'Expected EPS Growth',  val: fmtExpGrowth(epsG.pct, epsG.label),              col: epsG.label ? C.text : pctCol(epsG.pct, C) },
                    { label: 'Revenue Estimate',     val: revEstimate != null ? fmtRev(revEstimate) : '—', col: C.text },
                    { label: 'Expected Rev Growth',  val: fmtExpGrowth(revGPct, null),                     col: pctCol(revGPct, C) },
                  ].map(({ label, val, col }) => (
                    <div key={label} style={{ textAlign: 'center' as const }}>
                      <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: col }}>{val}</div>
                    </div>
                  ))}
                </div>
              </GCard>
            );
          })()}

          <GCard C={C}>
            <SecLabel text="Growth Context" C={C} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[
                { label: 'Rev QoQ', val: fmtPct(q.revenue_qoq_pct), col: pctCol(q.revenue_qoq_pct, C) },
                { label: 'Rev YoY', val: fmtPct(q.revenue_yoy_pct), col: pctCol(q.revenue_yoy_pct, C) },
                { label: 'EPS QoQ', val: epsTransition(q.eps_qoq), col: C.text },
                { label: 'EPS YoY', val: epsTransition(q.eps_yoy), col: C.text },
              ].map(({ label, val, col }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: col }}>{val}</div>
                </div>
              ))}
            </div>
          </GCard>

          {hasPriceReaction && (
            <GCard C={C}>
              <SecLabel text="Price Reaction" C={C} />
              {isApprox && <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginBottom: 8 }}>Close-to-close approximation</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { label: 'Opening Gap', v: pr!.opening_gap_pct },
                  { label: 'Post 1D',     v: pr!.reaction_1d_pct },
                  { label: '3-Day',       v: pr!.reaction_3d_pct },
                  { label: '5-Day',       v: pr!.reaction_5d_pct },
                  { label: 'Max Upside',  v: pr!.max_upside_5d_pct },
                  { label: 'Max Drawdown',v: pr!.max_drawdown_5d_pct },
                ].map(({ label, v }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: _f, color: pctCol(v, C) }}>{v != null ? fmtPct(v) : '—'}</div>
                  </div>
                ))}
              </div>
            </GCard>
          )}

          {rs && cov.has_reactions && (
            <GCard C={C}>
              <SecLabel text="Historical Reaction Context" C={C} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { label: 'Avg Post 1D', val: fmtPct(rs.average_1d_pct), obs: rs.observations_1d },
                  { label: 'Median 1D',  val: fmtPct(rs.median_1d_pct),   obs: rs.observations_1d },
                  { label: 'Avg |1D|',   val: fmtPct(rs.average_absolute_1d_pct, false), obs: rs.observations_1d },
                  { label: '% Positive', val: rs.positive_1d_rate != null ? `${rs.positive_1d_rate.toFixed(0)}%` : '—', obs: null },
                  { label: 'Largest +',  val: fmtPct(rs.largest_positive_1d_pct), obs: null },
                  { label: 'Largest −',  val: fmtPct(rs.largest_negative_1d_pct), obs: null },
                ].map(({ label, val, obs }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: _f, color: C.text }}>{val}</div>
                    {obs != null && <div style={{ fontSize: 8, color: C.dim, fontFamily: _f }}>{obs} obs.</div>}
                  </div>
                ))}
              </div>
            </GCard>
          )}
        </>
      ) : (
        /* ── PATH C: Fallback — reported card only ───────────────────────── */
        <>
          <div style={{ fontSize: 9, fontWeight: 800, color: C.teal, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>Latest Earnings</div>
          {renderReportedCard()}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HISTORY SUB-TAB
   ═══════════════════════════════════════════════════════════════ */
type HistoryRange = '3y' | 'max';

function HistorySubTab({ ei, C }: { ei: EarningsIntelligence; C: any }) {
  const [range, setRange] = useState<HistoryRange>('max');
  const hist = ei.earnings_history;
  const cov = ei.source_status.coverage;

  if (!cov.has_earnings_history || hist.length === 0) {
    return <Empty msg="Historical earnings data is not available from the current provider." C={C} />;
  }

  const sorted = useMemo(() => [...hist].reverse(), [hist]);
  const filtered = useMemo(() => range === '3y' ? sorted.slice(-12) : sorted, [sorted, range]);

  const chartData = useMemo(() => filtered.map(q => ({
    label: fmtQuarter(q), date: fmtDate(q.date),
    revActual: q.revenue_actual, revEstimate: q.revenue_estimate,
    revSurprisePct: q.revenue_surprise_pct, revSurprise: q.revenue_surprise_amount,
    revQoQ: q.revenue_qoq_pct, revYoY: q.revenue_yoy_pct,
    epsActual: q.eps_actual, epsEstimate: q.eps_estimate,
    epsSurprisePct: q.eps_surprise_pct, epsSurprise: q.eps_surprise_amount,
    epsQoQ: q.eps_qoq, epsYoY: q.eps_yoy, _q: q,
  })), [filtered]);

  const beatStats = useMemo(() => {
    let rb = 0, rt = 0, eb = 0, et = 0;
    for (const q of hist) {
      if (q.revenue_actual != null && q.revenue_estimate != null) { rt++; if ((q.revenue_surprise_pct ?? 0) > 0) rb++; }
      if (q.eps_actual != null && q.eps_estimate != null) { et++; if ((q.eps_surprise_pct ?? 0) > 0) eb++; }
    }
    return { rb, rt, eb, et };
  }, [hist]);

  const RevTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 12px', fontSize: 10, fontFamily: _f, maxWidth: 230 }}>
        <div style={{ color: '#0ea5e9', fontWeight: 800, marginBottom: 4 }}>{label} · {d.date}</div>
        <KV k="Actual"   v={fmtRev(d.revActual)} vc="#0ea5e9" />
        {d.revEstimate != null && <KV k="Estimate" v={fmtRev(d.revEstimate)} />}
        {d.revSurprise != null && <KV k="Surprise" v={`${fmtRev(d.revSurprise)} (${fmtPct(d.revSurprisePct)})`} vc={(d.revSurprisePct ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        {d.revQoQ != null && <KV k="QoQ" v={fmtPct(d.revQoQ)} vc={d.revQoQ >= 0 ? '#22c55e' : '#ef4444'} />}
        {d.revYoY != null && <KV k="YoY" v={fmtPct(d.revYoY)} vc={d.revYoY >= 0 ? '#22c55e' : '#ef4444'} />}
      </div>
    );
  };

  const EpsTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 12px', fontSize: 10, fontFamily: _f, maxWidth: 230 }}>
        <div style={{ color: '#0ea5e9', fontWeight: 800, marginBottom: 4 }}>{label}</div>
        <KV k="EPS Actual"   v={fmtEps(d.epsActual)} vc={(d.epsActual ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />
        {d.epsEstimate != null && <KV k="EPS Estimate" v={fmtEps(d.epsEstimate)} />}
        {d.epsSurprise != null && <KV k="Surprise" v={fmtEps(d.epsSurprise)} vc={(d.epsSurprisePct ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        <KV k="QoQ" v={epsTransition(d.epsQoQ, true)} />
        <KV k="YoY" v={epsTransition(d.epsYoY, true)} />
      </div>
    );
  };

  const { rb, rt, eb, et } = beatStats;
  const showMax = hist.length > 12;
  const interval = chartData.length > 14 ? Math.floor(chartData.length / 8) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        {(showMax ? ['3y', 'max'] as HistoryRange[] : ['max'] as HistoryRange[]).map(r => (
          <RangeBtn key={r} label={r === '3y' ? '3Y' : 'Max'} active={range === r} onClick={() => setRange(r)} C={C} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { title: 'Revenue Beat Rate', beats: rb, total: rt },
          { title: 'EPS Beat Rate',     beats: eb, total: et },
        ].map(({ title, beats, total }) => {
          const rate = total > 0 ? beats / total : 0;
          const col = total === 0 ? C.dim : rate >= 0.6 ? C.green : rate >= 0.4 ? C.amber : C.red;
          return (
            <GCard key={title} C={C}>
              <SecLabel text={title} C={C} />
              <span style={{ fontSize: 18, fontWeight: 900, fontFamily: _f, color: col }}>
                {total > 0 ? `${beats} / ${total}` : '—'}
              </span>
              {total > 0 && <span style={{ fontSize: 9, color: C.dim, fontFamily: _f, marginLeft: 6 }}>{(rate * 100).toFixed(0)}%</span>}
            </GCard>
          );
        })}
      </div>

      <GCard C={C}>
        <SecLabel text="Revenue" C={C} />
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} barGap={2} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#a9aaa6', fontFamily: _f }} axisLine={false} tickLine={false} interval={interval} />
            <YAxis hide tickFormatter={fmtRevShort} />
            <RechartTooltip content={<RevTooltip />} />
            <Bar dataKey="revActual"   name="Actual"   fill="#0ea5e9" radius={[2,2,0,0]} maxBarSize={32} />
            <Bar dataKey="revEstimate" name="Estimate" fill="rgba(255,255,255,0.15)" radius={[2,2,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </GCard>

      <GCard C={C}>
        <SecLabel text="EPS" C={C} />
        {hist.length === 1 && <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginBottom: 6 }}>More history will appear after additional reported quarters.</div>}
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} barGap={2} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#a9aaa6', fontFamily: _f }} axisLine={false} tickLine={false} interval={interval} />
            <YAxis hide />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
            <RechartTooltip content={<EpsTooltip />} />
            <Bar dataKey="epsActual" name="Actual" radius={[2,2,0,0]} maxBarSize={32}>
              {chartData.map((d, i) => <Cell key={i} fill={(d.epsActual ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />)}
            </Bar>
            <Bar dataKey="epsEstimate" name="Estimate" fill="rgba(255,255,255,0.15)" radius={[2,2,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </GCard>

      <GCard C={C}>
        <SecLabel text="Quarterly History" C={C} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: _f }}>
            <thead>
              <tr>
                {['Quarter','Date','Timing','Rev Est','Rev Act','Rev Surp','Rev QoQ','Rev YoY','EPS Est','EPS Act','EPS Surp','EPS QoQ','EPS YoY','Post 1D'].map(h => (
                  <th key={h} style={{ padding: '4px 7px', textAlign: 'left', color: C.dim, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hist.map((q, i) => {
                const pr = q.price_reaction;
                return (
                  <tr key={i} style={{ borderBottom: 'none' }}>
                    <td style={{ padding: '4px 7px', color: C.text, whiteSpace: 'nowrap' }}>{fmtQuarter(q)}</td>
                    <td style={{ padding: '4px 7px', color: C.dim, whiteSpace: 'nowrap' }}>{q.date ?? '—'}</td>
                    <td style={{ padding: '4px 7px', color: C.dim, whiteSpace: 'nowrap' }}>{q.timing ? (TIMING_BADGE[q.timing] ?? q.timing) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: C.dim }}>{fmtRev(q.revenue_estimate)}</td>
                    <td style={{ padding: '4px 7px', color: C.text }}>{fmtRev(q.revenue_actual)}</td>
                    <td style={{ padding: '4px 7px', color: surpriseCol(q.revenue_surprise_pct, C) }}>{fmtPct(q.revenue_surprise_pct)}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(q.revenue_qoq_pct, C) }}>{fmtPct(q.revenue_qoq_pct)}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(q.revenue_yoy_pct, C) }}>{fmtPct(q.revenue_yoy_pct)}</td>
                    <td style={{ padding: '4px 7px', color: C.dim }}>{fmtEps(q.eps_estimate)}</td>
                    <td style={{ padding: '4px 7px', color: (q.eps_actual ?? 0) >= 0 ? C.green : C.red }}>{fmtEps(q.eps_actual)}</td>
                    <td style={{ padding: '4px 7px', color: surpriseCol(q.eps_surprise_pct, C) }}>{Math.abs(q.eps_surprise_pct ?? 0) < 600 ? fmtPct(q.eps_surprise_pct) : surpriseLabel(q.eps_surprise_pct)}</td>
                    <td style={{ padding: '4px 7px', color: C.dim, whiteSpace: 'nowrap' }}>{epsTransition(q.eps_qoq)}</td>
                    <td style={{ padding: '4px 7px', color: C.dim, whiteSpace: 'nowrap' }}>{epsTransition(q.eps_yoy)}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.post_earnings_1d_pct ?? pr?.reaction_1d_pct ?? null, C) }}>{(pr?.post_earnings_1d_pct ?? pr?.reaction_1d_pct) != null ? fmtPct(pr?.post_earnings_1d_pct ?? pr?.reaction_1d_pct ?? null) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRICE MOVES SUB-TAB
   ═══════════════════════════════════════════════════════════════ */
type ReactionHorizon = 'pre-1d' | 'post-1d' | '3d' | '5d' | 'pre-vs-post';
const HORIZON_LABELS: Record<ReactionHorizon, string> = {
  'pre-1d': 'Pre 1D', 'post-1d': 'Post 1D', '3d': '3D', '5d': '5D', 'pre-vs-post': 'Pre vs Post',
};

function PriceMovesSubTab({ ei, C }: { ei: EarningsIntelligence; C: any }) {
  const [horizon, setHorizon] = useState<ReactionHorizon>('pre-vs-post');
  const hist = ei.earnings_history;
  const rs = ei.reaction_summary;
  const cov = ei.source_status.coverage;

  if (!cov.has_reactions) {
    return <Empty msg="Earnings price reaction data is not available for this symbol." C={C} />;
  }

  const getHorizonVal = (q: EarningsQuarter): number | null => {
    const pr = q.price_reaction;
    if (!pr) return null;
    if (horizon === 'pre-1d') return pr.pre_earnings_1d_pct;
    if (horizon === 'post-1d') return pr.post_earnings_1d_pct ?? pr.reaction_1d_pct;
    if (horizon === '3d') return pr.reaction_3d_pct;
    return pr.reaction_5d_pct;
  };

  const chartData = useMemo(() => {
    return [...hist].reverse().reduce<Array<{ label: string; val: number | null; _q: EarningsQuarter }>>((acc, q) => {
      const v = getHorizonVal(q);
      if (v != null) acc.push({ label: fmtQuarter(q), val: v, _q: q });
      return acc;
    }, []);
  }, [hist, horizon]);

  const pvpData = useMemo(() => {
    return [...hist].reverse().map(q => {
      const pr = q.price_reaction;
      return {
        label: fmtQuarter(q),
        preVal: pr?.pre_earnings_1d_pct ?? undefined,
        postVal: pr?.reaction_1d_pct ?? undefined,
        _q: q,
      };
    }).filter(d => d.preVal !== undefined || d.postVal !== undefined);
  }, [hist]);

  const horizonObs = horizon === 'pre-1d' ? rs?.observations_pre_1d
    : horizon === 'post-1d' ? rs?.observations_post_1d
    : horizon === '3d' ? rs?.observations_3d : rs?.observations_5d;
  const horizonAvg = horizon === 'pre-1d' ? rs?.average_pre_1d_pct
    : horizon === 'post-1d' ? rs?.average_post_1d_pct
    : horizon === '3d' ? rs?.average_3d_pct : rs?.average_5d_pct;
  const horizonMedian = horizon === 'pre-1d' ? rs?.median_pre_1d_pct
    : horizon === 'post-1d' ? rs?.median_post_1d_pct
    : null;

  const interval = chartData.length > 14 ? Math.floor(chartData.length / 8) : 0;
  const pvpInterval = pvpData.length > 14 ? Math.floor(pvpData.length / 8) : 0;

  const ReactTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const q: EarningsQuarter = d._q;
    const pr = q.price_reaction;
    return (
      <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 12px', fontSize: 10, fontFamily: _f, maxWidth: 270 }}>
        <div style={{ color: '#0ea5e9', fontWeight: 800, marginBottom: 4 }}>{label} · {fmtDate(q.date)}</div>
        {q.timing && <KV k="Timing" v={TIMING_FULL[q.timing] ?? q.timing} />}
        {q.revenue_surprise_pct != null && <KV k="Rev Surprise" v={fmtPct(q.revenue_surprise_pct)} vc={(q.revenue_surprise_pct ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        {q.eps_surprise_pct != null && Math.abs(q.eps_surprise_pct) < 600 && <KV k="EPS Surprise" v={fmtPct(q.eps_surprise_pct)} vc={(q.eps_surprise_pct ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        {pr?.opening_gap_pct != null  && <KV k="Opening Gap"  v={fmtPct(pr.opening_gap_pct)}  vc={pctCol(pr.opening_gap_pct,  C)} />}
        {pr?.pre_earnings_1d_pct != null && <KV k="Pre 1D" v={fmtPct(pr.pre_earnings_1d_pct)} vc={pctCol(pr.pre_earnings_1d_pct, C)} />}
        {pr?.reaction_1d_pct != null  && <KV k="Post 1D"      v={fmtPct(pr.reaction_1d_pct)}  vc={pctCol(pr.reaction_1d_pct,  C)} />}
        {pr?.reaction_3d_pct != null  && <KV k="3D"           v={fmtPct(pr.reaction_3d_pct)}  vc={pctCol(pr.reaction_3d_pct,  C)} />}
        {pr?.reaction_5d_pct != null  && <KV k="5D"           v={fmtPct(pr.reaction_5d_pct)}  vc={pctCol(pr.reaction_5d_pct,  C)} />}
        {pr?.max_upside_5d_pct != null   && <KV k="Max Upside"   v={fmtPct(pr.max_upside_5d_pct)}   vc="#22c55e" />}
        {pr?.max_drawdown_5d_pct != null && <KV k="Max Drawdown" v={fmtPct(pr.max_drawdown_5d_pct)} vc="#ef4444" />}
        {pr?.calculation_method && <KV k="Method" v={pr.calculation_method} vc="#a9aaa6" />}
        {pr && <KV k="Status" v={pr.reactions_final ? 'Final' : 'Preliminary'} vc={pr.reactions_final ? '#22c55e' : '#f59e0b'} />}
      </div>
    );
  };

  const PrePostTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const q: EarningsQuarter = d._q;
    const pr = q.price_reaction;
    const pattern = prePostPattern(pr?.pre_earnings_1d_pct ?? null, pr?.reaction_1d_pct ?? null);
    return (
      <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 12px', fontSize: 10, fontFamily: _f, maxWidth: 270 }}>
        <div style={{ color: '#0ea5e9', fontWeight: 800, marginBottom: 4 }}>{label} · {fmtDate(q.date)}</div>
        {q.timing && <KV k="Timing" v={TIMING_FULL[q.timing] ?? q.timing} />}
        {pr?.pre_earnings_session && <KV k="Pre Session"  v={pr.pre_earnings_session} vc="#a9aaa6" />}
        <KV k="Pre 1D" v={pr?.pre_earnings_1d_pct != null ? fmtPct(pr.pre_earnings_1d_pct) : '—'} vc={pctCol(pr?.pre_earnings_1d_pct ?? null, C)} />
        {pr?.post_earnings_session && <KV k="Post Session" v={pr.post_earnings_session} vc="#a9aaa6" />}
        <KV k="Post 1D" v={pr?.reaction_1d_pct != null ? fmtPct(pr.reaction_1d_pct) : '—'} vc={pctCol(pr?.reaction_1d_pct ?? null, C)} />
        {pr?.opening_gap_pct != null && <KV k="Opening Gap" v={fmtPct(pr.opening_gap_pct)} vc={pctCol(pr.opening_gap_pct, C)} />}
        {pr?.reaction_3d_pct != null && <KV k="3D" v={fmtPct(pr.reaction_3d_pct)} vc={pctCol(pr.reaction_3d_pct, C)} />}
        {pr?.reaction_5d_pct != null && <KV k="5D" v={fmtPct(pr.reaction_5d_pct)} vc={pctCol(pr.reaction_5d_pct, C)} />}
        <KV k="Pattern" v={pattern} vc={patternCol(pattern, C)} />
        {pr?.pre_post_method && <KV k="Method" v={pr.pre_post_method} vc="#a9aaa6" />}
        {pr?.pre_post_confidence && <KV k="Confidence" v={pr.pre_post_confidence} vc="#a9aaa6" />}
        {pr && <KV k="Status" v={pr.reactions_final ? 'Final' : 'Preliminary'} vc={pr.reactions_final ? '#22c55e' : '#f59e0b'} />}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary metrics */}
      {rs && (
        <GCard C={C}>
          {/* Panels A + B: Before / After Earnings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Panel A: Before Earnings */}
            <div>
              <div style={{ marginBottom: 6 }}>
                <SecLabel text="Before Earnings" C={C} />
                {rs.observations_pre_1d != null && (
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>Based on {rs.observations_pre_1d} events · Session before earnings</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {([
                  { label: 'Average Pre-Earnings Move',          val: fmtPct(rs.average_pre_1d_pct),                sub: 'Mean return before earnings',               col: pctCol(rs.average_pre_1d_pct, C) },
                  { label: 'Median Pre-Earnings Move',           val: fmtPct(rs.median_pre_1d_pct),                sub: 'Middle pre-earnings return',                col: pctCol(rs.median_pre_1d_pct, C) },
                  { label: 'Average Absolute Pre-Earnings Move', val: fmtPct(rs.average_absolute_pre_1d_pct, false), sub: 'Typical magnitude regardless of direction', col: C.text },
                ] as Array<{ label: string; val: string; sub: string; col: string }>).map(({ label, val, sub, col }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, padding: '6px 8px' }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, lineHeight: '1.35' }}>{label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: col }}>{val || '—'}</div>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Panel B: After Earnings */}
            <div>
              <div style={{ marginBottom: 6 }}>
                <SecLabel text="After Earnings" C={C} />
                {rs.observations_post_1d != null && (
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>Based on {rs.observations_post_1d} events · First post-earnings session</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {([
                  { label: 'Average Post-Earnings Move',          val: fmtPct(rs.average_post_1d_pct),                sub: 'Mean first-session reaction',               col: pctCol(rs.average_post_1d_pct, C) },
                  { label: 'Median Post-Earnings Move',           val: fmtPct(rs.median_post_1d_pct),                sub: 'Middle first-session reaction',             col: pctCol(rs.median_post_1d_pct, C) },
                  { label: 'Average Absolute Post-Earnings Move', val: fmtPct(rs.average_absolute_post_1d_pct, false), sub: 'Typical reaction magnitude',               col: C.text },
                  { label: 'Positive Reaction Rate',              val: rs.positive_1d_rate != null ? `${rs.positive_1d_rate.toFixed(0)}%` : '—', sub: 'Share of reactions above 0%', col: rs.positive_1d_rate != null ? (rs.positive_1d_rate > 52 ? C.green : rs.positive_1d_rate < 48 ? C.red : C.text) : C.dim },
                ] as Array<{ label: string; val: string; sub: string; col: string }>).map(({ label, val, sub, col }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, padding: '6px 8px' }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, lineHeight: '1.35' }}>{label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: col }}>{val || '—'}</div>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panels C + D: Directional Pattern / Conditional Outcomes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: (rs.average_post_after_positive_pre != null || rs.average_post_after_negative_pre != null) ? '1fr 1fr' : '1fr',
            gap: 14, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`
          }}>
            {/* Panel C: Directional Pattern */}
            <div>
              <div style={{ marginBottom: 6 }}>
                <SecLabel text="Directional Pattern" C={C} />
                <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>Compares the direction of pre-earnings and post-earnings moves</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { label: 'Same-Direction Follow-Through', val: rs.continuation_rate != null ? `${rs.continuation_rate.toFixed(0)}%` : '—', count: rs.continuation_count, sub: 'Pre and post move in the same direction' },
                  { label: 'Opposite-Direction Reversal',   val: rs.reversal_rate     != null ? `${rs.reversal_rate.toFixed(0)}%` : '—',     count: rs.reversal_count,     sub: 'Post-earnings move reversed the pre-earnings direction' },
                ].map(({ label, val, count, sub }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, padding: '6px 8px' }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, lineHeight: '1.35' }}>{label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: C.text }}>{val}</div>
                      {count != null && <div style={{ fontSize: 8, color: C.dim, fontFamily: _s }}>{count} events</div>}
                    </div>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Panel D: Conditional Outcomes */}
            {(rs.average_post_after_positive_pre != null || rs.average_post_after_negative_pre != null) && (
              <div>
                <div style={{ marginBottom: 6 }}>
                  <SecLabel text="Conditional Outcomes" C={C} />
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>Average post-earnings move based on pre-earnings direction</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {rs.average_post_after_positive_pre != null && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, padding: '6px 8px' }}>
                      <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, lineHeight: '1.35' }}>After a Positive Pre-Earnings Day</div>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: pctCol(rs.average_post_after_positive_pre, C) }}>{fmtPct(rs.average_post_after_positive_pre)}</div>
                      <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>Average post-earnings move</div>
                    </div>
                  )}
                  {rs.average_post_after_negative_pre != null && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, padding: '6px 8px' }}>
                      <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, lineHeight: '1.35' }}>After a Negative Pre-Earnings Day</div>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: pctCol(rs.average_post_after_negative_pre, C) }}>{fmtPct(rs.average_post_after_negative_pre)}</div>
                      <div style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginTop: 2 }}>Average post-earnings move</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Horizon-specific summary (chart filter selection — preserved) */}
          {(horizon !== 'pre-vs-post') && (horizonAvg != null || horizonMedian != null) && (
            <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
              <div>
                <span style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase' }}>Avg {HORIZON_LABELS[horizon]}</span>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: pctCol(horizonAvg ?? null, C), marginLeft: 8 }}>{fmtPct(horizonAvg ?? null)}</span>
                {horizonObs != null && <span style={{ fontSize: 8, color: C.dim, fontFamily: _f, marginLeft: 4 }}>({horizonObs} obs.)</span>}
              </div>
              {horizonMedian != null && (
                <div>
                  <span style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase' }}>Median</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: _f, color: pctCol(horizonMedian, C), marginLeft: 8 }}>{fmtPct(horizonMedian)}</span>
                </div>
              )}
            </div>
          )}
        </GCard>
      )}

      {/* Horizon selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap' }}>
        {(['pre-1d', 'post-1d', '3d', '5d', 'pre-vs-post'] as ReactionHorizon[]).map(h => (
          <RangeBtn key={h} label={HORIZON_LABELS[h]} active={horizon === h} onClick={() => setHorizon(h)} C={C} />
        ))}
      </div>

      {/* Single-metric chart */}
      {horizon !== 'pre-vs-post' && (
        chartData.length > 0 ? (
          <GCard C={C}>
            <SecLabel text={`Earnings Reaction — ${HORIZON_LABELS[horizon]}`} C={C} />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#a9aaa6', fontFamily: _f }} axisLine={false} tickLine={false} interval={interval} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 8, fill: '#a9aaa6', fontFamily: _f }} axisLine={false} tickLine={false} width={38} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                <RechartTooltip content={<ReactTooltip />} />
                <Bar dataKey="val" name={HORIZON_LABELS[horizon]} radius={[2,2,0,0]} maxBarSize={28}>
                  {chartData.map((d, i) => <Cell key={i} fill={(d.val ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GCard>
        ) : (
          <Empty msg="No reaction data available for the selected horizon." C={C} />
        )
      )}

      {/* Pre vs Post paired chart */}
      {horizon === 'pre-vs-post' && (
        pvpData.length > 0 ? (
          <GCard C={C}>
            <SecLabel text="Pre vs Post 1D" C={C} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pvpData} barGap={3} barCategoryGap="30%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#a9aaa6', fontFamily: _f }} axisLine={false} tickLine={false} interval={pvpInterval} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 8, fill: '#a9aaa6', fontFamily: _f }} axisLine={false} tickLine={false} width={38} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                <RechartTooltip content={<PrePostTooltip />} />
                <Bar dataKey="preVal" name="Pre 1D" radius={[2,2,0,0]} maxBarSize={16}>
                  {pvpData.map((d, i) => (
                    <Cell key={i} fill={d.preVal == null ? 'transparent' : d.preVal >= 0 ? '#86efac' : '#fca5a5'} />
                  ))}
                </Bar>
                <Bar dataKey="postVal" name="Post 1D" radius={[2,2,0,0]} maxBarSize={16}>
                  {pvpData.map((d, i) => (
                    <Cell key={i} fill={d.postVal == null ? 'transparent' : d.postVal >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              {[
                { col: '#86efac', label: 'Pre 1D +' }, { col: '#fca5a5', label: 'Pre 1D −' },
                { col: '#22c55e', label: 'Post 1D +' }, { col: '#ef4444', label: 'Post 1D −' },
              ].map(({ col, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: col }} />
                  <span style={{ fontSize: 8, color: C.dim, fontFamily: _f }}>{label}</span>
                </div>
              ))}
            </div>
          </GCard>
        ) : (
          <Empty msg="No pre/post reaction data available." C={C} />
        )
      )}

      {/* Reaction table */}
      <GCard C={C}>
        <SecLabel text="Reaction History" C={C} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: _f }}>
            <thead>
              <tr>
                {['Quarter','Timing','Rev Surp','EPS Surp','Pre 1D','Post 1D','Gap','3D','5D','Max Up','Max Dn','Pattern','Status'].map(h => (
                  <th key={h} style={{ padding: '4px 7px', textAlign: 'left', color: C.dim, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hist.map((q, i) => {
                const pr = q.price_reaction;
                const pattern = prePostPattern(pr?.pre_earnings_1d_pct ?? null, pr?.reaction_1d_pct ?? null);
                const status = !pr ? '—'
                  : pr.calculation_method === 'skipped_no_nearby_bar' ? 'Unavailable'
                  : !pr.reactions_final ? 'Preliminary' : 'Final';
                const statusCol = status === 'Final' ? C.green : status === 'Preliminary' ? C.amber : C.dim;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ padding: '4px 7px', color: C.text, whiteSpace: 'nowrap' }}>{fmtQuarter(q)}</td>
                    <td style={{ padding: '4px 7px', color: C.dim, whiteSpace: 'nowrap' }}>{q.timing ? (TIMING_BADGE[q.timing] ?? q.timing) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: surpriseCol(q.revenue_surprise_pct, C) }}>{fmtPct(q.revenue_surprise_pct)}</td>
                    <td style={{ padding: '4px 7px', color: surpriseCol(q.eps_surprise_pct, C) }}>
                      {q.eps_surprise_pct != null ? (Math.abs(q.eps_surprise_pct) < 600 ? fmtPct(q.eps_surprise_pct) : surpriseLabel(q.eps_surprise_pct)) : '—'}
                    </td>
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.pre_earnings_1d_pct ?? null, C) }}>{pr?.pre_earnings_1d_pct != null ? fmtPct(pr.pre_earnings_1d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.post_earnings_1d_pct ?? pr?.reaction_1d_pct ?? null, C) }}>{(pr?.post_earnings_1d_pct ?? pr?.reaction_1d_pct) != null ? fmtPct(pr?.post_earnings_1d_pct ?? pr?.reaction_1d_pct ?? null) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.opening_gap_pct ?? null, C) }}>{pr?.opening_gap_pct != null ? fmtPct(pr.opening_gap_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.reaction_3d_pct ?? null, C) }}>{pr?.reaction_3d_pct != null ? fmtPct(pr.reaction_3d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.reaction_5d_pct ?? null, C) }}>{pr?.reaction_5d_pct != null ? fmtPct(pr.reaction_5d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: C.green }}>{pr?.max_upside_5d_pct != null ? fmtPct(pr.max_upside_5d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: C.red }}>{pr?.max_drawdown_5d_pct != null ? fmtPct(pr.max_drawdown_5d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: patternCol(pattern, C), whiteSpace: 'nowrap' }}>{pattern}</td>
                    <td style={{ padding: '4px 7px', color: statusCol, whiteSpace: 'nowrap' }}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GCard>

      <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, textAlign: 'center', padding: '2px 0 6px' }}>
        Historical reactions use regular-session price data. Earnings timing may be inferred from available filing metadata, and exact historical after-hours reactions may be unavailable.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RATINGS SUB-TAB
   ═══════════════════════════════════════════════════════════════ */
function RatingsSubTab({ ei, currentPrice, C }: { ei: EarningsIntelligence; currentPrice: number | null; C: any }) {
  const { consensus, price_target: pt, price_target_summary: pts, monthly_distribution: monthDist, recent_actions: actions } = ei.ratings;
  const cov = ei.source_status.coverage;
  const [pubOpen, setPubOpen] = useState(false);

  const cons: RatingsConsensus | null = cov.has_ratings_consensus && consensus && 'total_ratings' in consensus
    ? consensus as RatingsConsensus : null;

  const monthData = useMemo(() => {
    return [...monthDist].reverse().slice(-12).map(m => ({
      label: fmtMonthLabel(m.month),
      strong_buy: m.strong_buy, buy: m.buy, hold: m.hold, sell: m.sell, strong_sell: m.strong_sell,
    }));
  }, [monthDist]);

  /* Buy / Hold / Sell bar calculations */
  const bhs = useMemo(() => {
    if (!cons) return null;
    const buyCount  = (cons.strong_buy ?? 0) + (cons.buy ?? 0);
    const holdCount = cons.hold ?? 0;
    const sellCount = (cons.sell ?? 0) + (cons.strong_sell ?? 0);
    const total = buyCount + holdCount + sellCount;
    if (total === 0) return null;
    return {
      buyCount, holdCount, sellCount, total,
      buyPct:  (buyCount  / total) * 100,
      holdPct: (holdCount / total) * 100,
      sellPct: (sellCount / total) * 100,
    };
  }, [cons]);

  /* Price target rail */
  const allPtVals = [pt?.low, pt?.high, currentPrice].filter((v): v is number => v != null);
  const railMin = allPtVals.length ? Math.min(...allPtVals) : null;
  const railMax = allPtVals.length ? Math.max(...allPtVals) : null;
  const railRange = railMin != null && railMax != null ? railMax - railMin : null;
  const toPct = (v: number | null): number | null => {
    if (v == null || railMin == null || !railRange) return null;
    return Math.min(100, Math.max(0, ((v - railMin) / railRange) * 100));
  };
  const ptPins = [
    { key: 'Low',     val: pt?.low ?? null,    color: '#ef4444' },
    { key: 'Median',  val: pt?.median ?? null,  color: '#f5f5f0' },
    { key: 'Avg',     val: pt?.average ?? null, color: '#0ea5e9' },
    { key: 'High',    val: pt?.high ?? null,    color: '#22c55e' },
    { key: 'Current', val: currentPrice,        color: '#f59e0b' },
  ].filter(p => p.val != null);

  const actionVerb = (a: RatingAction): string => {
    if (a.action === 'maintain' || a.action === 'reiterate') {
      return `Maintains ${a.new_grade ?? ''}`.trim();
    }
    if (a.action === 'upgrade') {
      return a.previous_grade && a.new_grade && a.previous_grade !== a.new_grade
        ? `${a.previous_grade} → ${a.new_grade}`
        : `Upgrades to ${a.new_grade ?? ''}`.trim();
    }
    if (a.action === 'downgrade') {
      return a.previous_grade && a.new_grade && a.previous_grade !== a.new_grade
        ? `${a.previous_grade} → ${a.new_grade}`
        : `Downgrades to ${a.new_grade ?? ''}`.trim();
    }
    if (a.action === 'initiate') return `Initiates at ${a.new_grade ?? ''}`.trim();
    return [a.action, a.new_grade].filter(Boolean).join(' ');
  };

  const actionBadgeCol = (action: string): string => {
    if (action === 'upgrade') return '#22c55e';
    if (action === 'downgrade') return '#ef4444';
    if (action === 'initiate') return '#0ea5e9';
    return '#a9aaa6';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* A. Consensus — Buy/Hold/Sell bars */}
      <GCard C={C}>
        <SecLabel text="Analyst Consensus" C={C} />
        {cons ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18, fontWeight: 900, fontFamily: _f, color: consensusCol(cons.consensus_label) }}>{cons.consensus_label}</span>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: _f }}>{cons.total_ratings} analysts</span>
            </div>
            {bhs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Buy',  count: bhs.buyCount,  pct: bhs.buyPct,  color: '#22c55e' },
                  { label: 'Hold', count: bhs.holdCount, pct: bhs.holdPct, color: '#f59e0b' },
                  { label: 'Sell', count: bhs.sellCount, pct: bhs.sellPct, color: '#ef4444' },
                ].map(({ label, count, pct, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, fontSize: 9, fontWeight: 800, fontFamily: _f, color }}>{label}</div>
                    <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, opacity: 0.85, borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ width: 30, fontSize: 9, fontWeight: 800, fontFamily: _f, color, textAlign: 'right' }}>{Math.round(pct)}%</div>
                    <div style={{ width: 24, fontSize: 9, color: C.dim, fontFamily: _f, textAlign: 'right' }}>({count})</div>
                  </div>
                ))}
              </div>
            )}
            {/* Detailed breakdown */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {([
                { label: 'Str. Buy', val: cons.strong_buy, c: '#22c55e' },
                { label: 'Buy', val: cons.buy, c: '#4ade80' },
                { label: 'Hold', val: cons.hold, c: '#f59e0b' },
                { label: 'Sell', val: cons.sell, c: '#f87171' },
                { label: 'Str. Sell', val: cons.strong_sell, c: '#ef4444' },
              ] as { label: string; val: number; c: string }[]).map(({ label, val, c }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 1, background: c }} />
                  <span style={{ fontSize: 9, color: C.dim, fontFamily: _f }}>{label}: </span>
                  <span style={{ fontSize: 9, color: C.text, fontWeight: 700, fontFamily: _f }}>{val}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty msg="Analyst consensus unavailable" C={C} />
        )}
      </GCard>

      {/* B. Price target rail */}
      {cov.has_price_targets && pt ? (
        <GCard C={C}>
          <SecLabel text="Price Target Range" C={C} />
          <div style={{ position: 'relative', height: 56, margin: '8px 12px 18px' }}>
            <div style={{ position: 'absolute', top: 20, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
            {pt.low != null && pt.high != null && railRange && (
              <div style={{ position: 'absolute', top: 20, left: `${toPct(pt.low)}%`, width: `${(toPct(pt.high) ?? 0) - (toPct(pt.low) ?? 0)}%`, height: 3, background: 'rgba(14,165,233,0.35)', borderRadius: 2 }} />
            )}
            {ptPins.map(p => {
              const pct = toPct(p.val);
              if (pct == null) return null;
              return (
                <div key={p.key} style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)', top: 8 }}>
                  <div style={{ width: 2, height: 14, background: p.color, borderRadius: 1, margin: '0 auto' }} />
                  <div style={{ fontSize: 7, color: p.color, fontFamily: _f, textAlign: 'center', whiteSpace: 'nowrap', marginTop: 1 }}>{p.key}</div>
                  <div style={{ fontSize: 8, color: p.color, fontFamily: _f, textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 700 }}>{fmtPrice(p.val)}</div>
                </div>
              );
            })}
          </div>
          {currentPrice != null && pt.average != null && (
            <div style={{ fontSize: 9, color: C.dim, fontFamily: _f }}>
              Avg target vs current:{' '}
              <span style={{ color: pt.average >= currentPrice ? C.green : C.red, fontWeight: 700 }}>
                {fmtPct(((pt.average - currentPrice) / currentPrice) * 100)}
              </span>
            </div>
          )}
        </GCard>
      ) : cov.has_price_targets === false ? (
        <GCard C={C}>
          <SecLabel text="Price Target Range" C={C} />
          <Empty msg="Price targets unavailable" C={C} />
        </GCard>
      ) : null}

      {/* C. Rolling target summary */}
      {pts && (
        <GCard C={C}>
          <SecLabel text="Rolling Target Summary" C={C} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { label: 'Last Month',   avg: pts.last_month_average,   count: pts.last_month_count },
              { label: 'Last Quarter', avg: pts.last_quarter_average, count: pts.last_quarter_count },
              { label: 'Last Year',    avg: pts.last_year_average,    count: pts.last_year_count },
              { label: 'All Time',     avg: pts.all_time_average,     count: pts.all_time_count },
            ].map(({ label, avg, count }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: _f, color: C.text }}>{avg != null ? fmtPrice(avg) : '—'}</div>
                {count != null && <div style={{ fontSize: 8, color: C.dim, fontFamily: _f }}>{count} targets</div>}
              </div>
            ))}
          </div>
          {pts.publishers && pts.publishers.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setPubOpen(o => !o)}
                style={{ fontSize: 8, color: C.dim, fontFamily: _f, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {pubOpen ? '▾' : '▸'} Sources ({pts.publishers.length})
              </button>
              {pubOpen && <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 4 }}>{pts.publishers.join(', ')}</div>}
            </div>
          )}
        </GCard>
      )}

      {/* D. Monthly distribution history */}
      {cov.has_rating_history && monthData.length > 0 && (
        <GCard C={C}>
          <SecLabel text="Rating Distribution History" C={C} />
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#a9aaa6', fontFamily: _f }} axisLine={false} tickLine={false} interval={monthData.length > 8 ? 2 : 0} />
              <YAxis hide />
              <RechartTooltip
                contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, fontSize: 10, fontFamily: _f }}
                labelStyle={{ color: '#0ea5e9', fontWeight: 800 }}
                itemStyle={{ color: '#f5f5f0', fontSize: 10 }}
              />
              <Bar dataKey="strong_buy"  name="Strong Buy"  stackId="a" fill="#22c55e" />
              <Bar dataKey="buy"         name="Buy"         stackId="a" fill="#4ade80" />
              <Bar dataKey="hold"        name="Hold"        stackId="a" fill="#f59e0b" />
              <Bar dataKey="sell"        name="Sell"        stackId="a" fill="#f87171" />
              <Bar dataKey="strong_sell" name="Strong Sell" stackId="a" fill="#ef4444" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </GCard>
      )}

      {/* E. Recent rating actions */}
      {cov.has_rating_actions && actions.length > 0 && (
        <GCard C={C}>
          <SecLabel text="Recent Analyst Actions" C={C} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {actions.slice(0, 30).map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < Math.min(actions.length, 30) - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _s, color: C.text }}>{a.firm}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, fontFamily: _f, color: actionBadgeCol(a.action), textTransform: 'uppercase' }}>{a.action}</span>
                    <span style={{ fontSize: 10, color: C.dim, fontFamily: _s }}>{actionVerb(a)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: _f, whiteSpace: 'nowrap' }}>{fmtDate(a.date)}</div>
              </div>
            ))}
            {actions.length > 30 && (
              <div style={{ fontSize: 9, color: C.dim, fontFamily: _f, textAlign: 'center', paddingTop: 6 }}>+{actions.length - 30} more actions</div>
            )}
          </div>
        </GCard>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MATERIALS SUB-TAB
   ═══════════════════════════════════════════════════════════════ */
function DocRow({ doc, fallbackLabel, C }: { doc: EarningsDocument; fallbackLabel: string; C: any }) {
  const url = doc.document_url || doc.filing_index_url;
  const classLabel = CLASSIFICATION_LABEL[doc.classification ?? ''] ?? fallbackLabel;
  const confBadge = doc.classification_confidence === 'high' ? null
    : doc.classification_confidence === 'medium' ? '~' : '?';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {doc.form && (
            <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.08)', color: C.text, fontFamily: _f, flexShrink: 0 }}>{doc.form}</span>
          )}
          {doc.document_type && doc.document_type !== doc.form && (
            <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: C.dim, fontFamily: _f }}>{doc.document_type}</span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: _s }}>{classLabel}</span>
          {confBadge && <span style={{ fontSize: 9, color: C.amber }} title="Classification confidence is not high">{confBadge}</span>}
        </div>
        {doc.description && doc.description !== doc.form && doc.description !== doc.document_type && (
          <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>{doc.description}</div>
        )}
        {doc.filed_date && (
          <div style={{ fontSize: 9, color: C.dim, fontFamily: _f, marginTop: 3 }}>{fmtDate(doc.filed_date)}{doc.source ? ` · ${doc.source}` : ''}</div>
        )}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.teal, textDecoration: 'none', whiteSpace: 'nowrap', padding: '4px 9px', border: `1px solid ${C.teal}40`, borderRadius: 3, flexShrink: 0 }}>
          Open ↗
        </a>
      )}
    </div>
  );
}

function PrimaryFilingRow({ pf, C }: { pf: PrimaryFilingRef; C: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {pf.form && <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.08)', color: C.text, fontFamily: _f }}>{pf.form}</span>}
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: _s }}>Primary Filing</span>
        </div>
        {pf.items && <div style={{ fontSize: 9, color: C.dim, fontFamily: _f, marginTop: 2 }}>Items: {pf.items}</div>}
        {pf.filed_date && <div style={{ fontSize: 9, color: C.dim, fontFamily: _f, marginTop: 2 }}>{fmtDate(pf.filed_date)}</div>}
      </div>
      {pf.filing_index_url && (
        <a href={pf.filing_index_url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.teal, textDecoration: 'none', whiteSpace: 'nowrap', padding: '4px 9px', border: `1px solid ${C.teal}40`, borderRadius: 3 }}>
          Open ↗
        </a>
      )}
    </div>
  );
}

function TranscriptRow({ transcript, C }: { transcript: TranscriptInfo; C: any }) {
  const col = TRANSCRIPT_COL[transcript.status] ?? '#a9aaa6';
  const label = TRANSCRIPT_LABEL[transcript.status] ?? 'Transcript availability unknown';
  const url = transcript.source_url;
  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.08)', color: C.text, fontFamily: _f }}>Transcript</span>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: _s, color: col }}>{label}</span>
          </div>
          {transcript.source_type && (
            <div style={{ fontSize: 9, color: C.dim, fontFamily: _f, marginTop: 2 }}>{transcript.source_type}</div>
          )}
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.teal, textDecoration: 'none', whiteSpace: 'nowrap', padding: '4px 9px', border: `1px solid ${C.teal}40`, borderRadius: 3 }}>
            Open ↗
          </a>
        )}
      </div>
    </div>
  );
}

type FilingCategory = 'all' | string;

function MaterialsSubTab({ ei, C }: { ei: EarningsIntelligence; C: any }) {
  const [filingCat, setFilingCat] = useState<FilingCategory>('all');
  const [expandedFiling, setExpandedFiling] = useState<string | null>(null);
  const mat = ei.materials;

  if (!mat) {
    return <Empty msg="Earnings materials are not available from the current first-party sources." C={C} />;
  }

  const lep = mat.latest_earnings_packet;
  const filings = mat.recent_filings ?? [];

  /* unique categories in filings */
  const cats = useMemo(() => {
    const seen = new Set<string>();
    for (const f of filings) if (f.category) seen.add(f.category);
    return Array.from(seen);
  }, [filings]);

  const filteredFilings = useMemo(() => {
    if (filingCat === 'all') return filings;
    return filings.filter(f => f.category === filingCat);
  }, [filings, filingCat]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Latest earnings packet */}
      <GCard C={C}>
        <SecLabel text="Latest Earnings Packet" C={C} />
        {lep ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              {lep.earnings_date && (
                <div>
                  <span style={{ fontSize: 8, color: C.dim, fontFamily: _f }}>EARNINGS DATE  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: _f }}>{fmtDate(lep.earnings_date)}</span>
                </div>
              )}
              {lep.days_since_filing != null && (
                <span style={{ fontSize: 9, color: C.dim, fontFamily: _f, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 10 }}>{lep.days_since_filing}d ago</span>
              )}
              {!lep.attachments_complete && (
                <span style={{ fontSize: 8, color: C.amber, fontFamily: _f, border: `1px solid ${C.amber}40`, padding: '2px 7px', borderRadius: 10 }}>Some attachments unavailable</span>
              )}
            </div>

            {/* Documents */}
            <div>
              {lep.primary_filing && <PrimaryFilingRow pf={lep.primary_filing} C={C} />}
              {lep.earnings_release && <DocRow doc={lep.earnings_release} fallbackLabel="Earnings Release" C={C} />}
              {lep.investor_presentation && <DocRow doc={lep.investor_presentation} fallbackLabel="Investor Presentation" C={C} />}
              {lep.supplemental_tables && lep.supplemental_tables.map((d, i) => <DocRow key={`sup-${i}`} doc={d} fallbackLabel="Supplemental Tables" C={C} />)}
              {lep.guidance_documents && lep.guidance_documents.map((d, i) => <DocRow key={`guid-${i}`} doc={d} fallbackLabel="Corporate Guidance" C={C} />)}
              {lep.prepared_remarks && <DocRow doc={lep.prepared_remarks} fallbackLabel="Prepared Remarks" C={C} />}
              {lep.related_financial_report && <DocRow doc={lep.related_financial_report} fallbackLabel="Financial Report" C={C} />}

              {/* Webcast */}
              {lep.webcast_url ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.08)', color: C.text, fontFamily: _f }}>Webcast</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: _s }}>Webcast / Replay</span>
                    </div>
                    {lep.webcast_source_document && (
                      <div style={{ fontSize: 9, color: C.dim, fontFamily: _f, marginTop: 2 }}>Source: {lep.webcast_source_document}</div>
                    )}
                  </div>
                  <a href={lep.webcast_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.teal, textDecoration: 'none', whiteSpace: 'nowrap', padding: '4px 9px', border: `1px solid ${C.teal}40`, borderRadius: 3 }}>
                    Open ↗
                  </a>
                </div>
              ) : (
                <div style={{ padding: '6px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                  <span style={{ fontSize: 9, color: C.dim, fontFamily: _f }}>Webcast unavailable</span>
                </div>
              )}

              {/* Transcript */}
              {lep.transcript ? (
                <TranscriptRow transcript={lep.transcript} C={C} />
              ) : (
                <div style={{ padding: '6px 0' }}>
                  <span style={{ fontSize: 9, color: C.dim, fontFamily: _f }}>Transcript availability unknown</span>
                </div>
              )}

              {/* Not_yet_available alternatives hint */}
              {lep.transcript?.status === 'not_yet_available' && (
                <div style={{ padding: '8px 0', fontSize: 9, color: C.dim, fontFamily: _s }}>
                  <div style={{ marginBottom: 4 }}>While the transcript is not yet available, the following materials may cover the earnings call:</div>
                  {[lep.earnings_release, lep.investor_presentation, lep.prepared_remarks].filter(Boolean).map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span style={{ color: C.teal }}>·</span>
                      <span>{CLASSIFICATION_LABEL[d!.classification ?? ''] ?? 'Document'}</span>
                      {(d!.document_url || d!.filing_index_url) && (
                        <a href={d!.document_url || d!.filing_index_url || ''} target="_blank" rel="noopener noreferrer"
                          style={{ color: C.teal, textDecoration: 'none', fontSize: 9 }}>↗</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <Empty msg="Latest earnings packet is not yet indexed for this symbol." C={C} />
        )}
      </GCard>

      {/* Recent SEC Filings */}
      {filings.length > 0 && (
        <GCard C={C}>
          <SecLabel text="Recent SEC Filings" C={C} />
          {/* Category filter */}
          {cats.length > 1 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10, overflowX: 'auto' }}>
              {(['all', ...cats] as FilingCategory[]).map(cat => {
                const label = cat === 'all' ? 'All' : (CATEGORY_LABEL[cat] ?? cat);
                const count = cat === 'all' ? filings.length : filings.filter(f => f.category === cat).length;
                return (
                  <button key={cat} onClick={() => setFilingCat(cat)}
                    style={{ padding: '3px 10px', borderRadius: 10, fontSize: 9, fontWeight: 700, fontFamily: _f, cursor: 'pointer', whiteSpace: 'nowrap',
                      background: filingCat === cat ? C.teal : 'transparent',
                      color: filingCat === cat ? '#000' : C.dim,
                      border: `1px solid ${filingCat === cat ? C.teal : C.border}` }}>
                    {label} <span style={{ opacity: 0.7 }}>({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filings list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filteredFilings.map((filing, idx) => {
              const url = filing.primary_document_url || filing.filing_index_url;
              const isExpanded = expandedFiling === filing.accession_number;
              const attachments = filing.attachments.filter(a => a.document_url);
              return (
                <div key={filing.accession_number || idx} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)`, paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.08)', color: C.text, fontFamily: _f, flexShrink: 0 }}>{filing.form}</span>
                        <span style={{ fontSize: 9, color: C.dim, fontFamily: _f }}>{CATEGORY_LABEL[filing.category] ?? filing.category}</span>
                        <span style={{ fontSize: 9, color: C.dim, fontFamily: _f }}>{fmtDateShort(filing.filed_date)}</span>
                      </div>
                      {filing.title && filing.title !== filing.form && (
                        <div style={{ fontSize: 9, color: C.text, fontFamily: _s, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>{filing.title}</div>
                      )}
                      {filing.items && (
                        <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, marginTop: 2 }}>Items: {filing.items}</div>
                      )}
                      {attachments.length > 0 && (
                        <button onClick={() => setExpandedFiling(isExpanded ? null : filing.accession_number)}
                          style={{ fontSize: 8, color: C.dim, fontFamily: _f, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 }}>
                          {isExpanded ? '▾' : '▸'} {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.teal, textDecoration: 'none', whiteSpace: 'nowrap', padding: '4px 9px', border: `1px solid ${C.teal}40`, borderRadius: 3, flexShrink: 0 }}>
                        Open ↗
                      </a>
                    )}
                  </div>
                  {/* Expanded attachments */}
                  {isExpanded && attachments.length > 0 && (
                    <div style={{ marginTop: 6, paddingLeft: 12, borderLeft: `2px solid rgba(255,255,255,0.08)` }}>
                      {attachments.map((att, ai) => (
                        <div key={ai} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: 8, color: C.dim, fontFamily: _f, marginRight: 6 }}>{att.document_type ?? att.filename}</span>
                            {att.description && att.description !== att.document_type && att.description !== att.filename && (
                              <span style={{ fontSize: 8, color: C.dim, fontFamily: _s }}>{att.description}</span>
                            )}
                            {att.classification && att.classification !== 'other' && (
                              <span style={{ fontSize: 8, color: C.teal, fontFamily: _f, marginLeft: 6 }}>{CLASSIFICATION_LABEL[att.classification] ?? att.classification}</span>
                            )}
                          </div>
                          {att.document_url && (
                            <a href={att.document_url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 8, color: C.teal, textDecoration: 'none', flexShrink: 0, marginLeft: 8 }}>↗</a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredFilings.length === 0 && (
            <Empty msg="No filings in this category." C={C} />
          )}
        </GCard>
      )}

      {filings.length === 0 && !lep && (
        <Empty msg="Earnings materials are not available from the current first-party sources." C={C} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EARNINGS TAB
   ═══════════════════════════════════════════════════════════════ */
export interface EarningsTabProps {
  detail: any;
  detailLoading: boolean;
  currentPrice: number | null;
  ticker?: string;
  initialSubTab?: SubTab;
  earningsEntry?: any;
}

export function EarningsTab({ detail, detailLoading, currentPrice, ticker, initialSubTab, earningsEntry }: EarningsTabProps) {
  const { C } = useTheme();
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab ?? 'overview');

  const ei = normalizeEarningsIntelligence(detail?.earnings_intelligence);

  if (detailLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.dim, fontFamily: _f, fontSize: 11 }}>
        Loading earnings data…
      </div>
    );
  }

  if (!ei) {
    return <Empty msg="Earnings intelligence is not available for this instrument." C={C} />;
  }

  return (
    <div>
      {/* Secondary tab nav */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 14, overflowX: 'auto' }}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            style={{ padding: '7px 14px', fontSize: 10, fontWeight: 700, fontFamily: _f, cursor: 'pointer',
              color: subTab === tab.id ? C.teal : C.dim, background: 'transparent', border: 'none',
              borderBottom: `2px solid ${subTab === tab.id ? C.teal : 'transparent'}`, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'overview'    && <OverviewSubTab    ei={ei} C={C} ticker={ticker} onSwitchToMaterials={() => setSubTab('materials')} earningsEntry={earningsEntry} />}
      {subTab === 'history'     && <HistorySubTab     ei={ei} C={C} />}
      {subTab === 'price-moves' && <PriceMovesSubTab  ei={ei} C={C} />}
      {subTab === 'ratings'     && <RatingsSubTab     ei={ei} currentPrice={currentPrice} C={C} />}
      {subTab === 'materials'   && <MaterialsSubTab   ei={ei} C={C} />}
    </div>
  );
}
