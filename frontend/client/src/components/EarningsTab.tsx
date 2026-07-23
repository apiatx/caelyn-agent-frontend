import { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
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

export interface EarningsIntelligence {
  schema_version: number;
  earnings_history: EarningsQuarter[];
  reaction_summary: ReactionSummary | null;
  ratings: RatingsData;
  sec_filings: null;
  source_status: SourceStatus;
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
function consensusCol(label: string): string {
  const l = (label || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (l.includes('BUY')) return '#22c55e';
  if (l.includes('HOLD') || l.includes('NEUTRAL')) return '#f59e0b';
  if (l.includes('SELL')) return '#ef4444';
  return '#a9aaa6';
}

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

/* ── sub-tab types ────────────────────────────────────────────── */
type SubTab = 'overview' | 'history' | 'price-moves' | 'ratings';
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'price-moves', label: 'Price Moves' },
  { id: 'ratings', label: 'Ratings' },
];

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW SUB-TAB
   ═══════════════════════════════════════════════════════════════ */
function OverviewSubTab({ ei, C }: { ei: EarningsIntelligence; C: any }) {
  const cov = ei.source_status.coverage;
  const hist = ei.earnings_history;
  const rs = ei.reaction_summary;

  if (!cov.has_earnings_history || hist.length === 0) {
    return <Empty msg="Historical earnings data is not available from the current provider." C={C} />;
  }

  const q = hist[0];
  const pr = q.price_reaction;
  const isInferred = q.timing_confidence === 'inferred_low';
  const isPrelim = pr && !pr.reactions_final;
  const isApprox = pr?.calculation_method?.includes('inferred');

  /* EPS surprise pct can be absurdly large when estimate crosses zero */
  const epsSpShowPct = q.eps_surprise_pct != null && Math.abs(q.eps_surprise_pct) < 600;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Quarter header */}
      <GCard C={C}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
          {isPrelim && (
            <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.amber, border: `1px solid ${C.amber}50` }}>PRELIMINARY</span>
          )}
          <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.green, border: `1px solid ${C.green}40` }}>REPORTED</span>
        </div>
        {isInferred && (
          <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 5 }}
            title="Earnings timing inferred from available filing metadata.">
            ⓘ Timing inferred from available filing metadata
          </div>
        )}
      </GCard>

      {/* Revenue + EPS side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          {
            title: 'Revenue',
            actual: fmtRev(q.revenue_actual),
            estimate: q.revenue_estimate != null ? fmtRev(q.revenue_estimate) : null,
            surpriseAmt: fmtRev(q.revenue_surprise_amount),
            surprisePct: q.revenue_surprise_pct,
            showPct: true,
          },
          {
            title: 'EPS',
            actual: fmtEps(q.eps_actual),
            estimate: q.eps_estimate != null ? fmtEps(q.eps_estimate) : null,
            surpriseAmt: q.eps_surprise_amount != null ? fmtEps(q.eps_surprise_amount) : '—',
            surprisePct: q.eps_surprise_pct,
            showPct: epsSpShowPct,
          },
        ].map(({ title, actual, estimate, surpriseAmt, surprisePct, showPct }) => (
          <GCard key={title} C={C}>
            <SecLabel text={title} C={C} />
            <div style={{ fontSize: 20, fontWeight: 900, color: C.bright, fontFamily: _f }}>{actual}</div>
            {estimate != null ? (
              <>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: _f, marginTop: 2 }}>Est. {estimate}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, fontFamily: _f, color: surpriseCol(surprisePct, C) }}>{surpriseAmt}</span>
                  {showPct && <span style={{ fontSize: 10, color: surpriseCol(surprisePct, C), fontFamily: _f }}>({fmtPct(surprisePct)})</span>}
                  {surpriseLabel(surprisePct) && (
                    <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 8, fontWeight: 800, fontFamily: _f, color: '#000', background: surpriseCol(surprisePct, C) }}>
                      {surpriseLabel(surprisePct)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 4 }}>Estimate unavailable</div>
            )}
          </GCard>
        ))}
      </div>

      {/* Growth context */}
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

      {/* Price reaction */}
      {pr && (
        <GCard C={C}>
          <SecLabel text="Price Reaction" C={C} />
          {isApprox && <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginBottom: 8 }}>Close-to-close approximation</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Opening Gap', v: pr.opening_gap_pct },
              { label: '1-Day',       v: pr.reaction_1d_pct },
              { label: '3-Day',       v: pr.reaction_3d_pct },
              { label: '5-Day',       v: pr.reaction_5d_pct },
              { label: 'Max Upside',  v: pr.max_upside_5d_pct },
              { label: 'Max Drawdown',v: pr.max_drawdown_5d_pct },
            ].map(({ label, v }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: C.dim, fontFamily: _f, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: _f, color: pctCol(v, C) }}>
                  {v != null ? fmtPct(v) : '—'}
                </div>
              </div>
            ))}
          </div>
        </GCard>
      )}

      {/* Historical reaction context */}
      {rs && cov.has_reactions && (
        <GCard C={C}>
          <SecLabel text="Historical Reaction Context" C={C} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Avg 1D Move', val: fmtPct(rs.average_1d_pct), obs: rs.observations_1d },
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

  const filtered = useMemo(() => {
    if (range === '3y') return sorted.slice(-12);
    return sorted;
  }, [sorted, range]);

  const chartData = useMemo(() => filtered.map(q => ({
    label: fmtQuarter(q),
    date: fmtDate(q.date),
    revActual: q.revenue_actual,
    revEstimate: q.revenue_estimate,
    revSurprisePct: q.revenue_surprise_pct,
    revSurprise: q.revenue_surprise_amount,
    revQoQ: q.revenue_qoq_pct,
    revYoY: q.revenue_yoy_pct,
    epsActual: q.eps_actual,
    epsEstimate: q.eps_estimate,
    epsSurprisePct: q.eps_surprise_pct,
    epsSurprise: q.eps_surprise_amount,
    epsQoQ: q.eps_qoq,
    epsYoY: q.eps_yoy,
    _q: q,
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
      {/* Range selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        {(showMax ? ['3y', 'max'] as HistoryRange[] : ['max'] as HistoryRange[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{ padding: '3px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _f, cursor: 'pointer', background: range === r ? C.teal : 'transparent', color: range === r ? '#000' : C.dim, border: `1px solid ${range === r ? C.teal : C.border}` }}>
            {r === '3y' ? '3Y' : 'Max'}
          </button>
        ))}
      </div>

      {/* Beat rates */}
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

      {/* Revenue chart */}
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

      {/* EPS chart */}
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

      {/* Table */}
      <GCard C={C}>
        <SecLabel text="Quarterly History" C={C} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: _f }}>
            <thead>
              <tr>
                {['Quarter','Date','Timing','Rev Est','Rev Act','Rev Surp','Rev QoQ','Rev YoY','EPS Est','EPS Act','EPS Surp','EPS QoQ','EPS YoY','1D'].map(h => (
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
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.reaction_1d_pct ?? null, C) }}>{pr?.reaction_1d_pct != null ? fmtPct(pr.reaction_1d_pct) : '—'}</td>
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
type ReactionHorizon = '1d' | '3d' | '5d';

function PriceMovesSubTab({ ei, C }: { ei: EarningsIntelligence; C: any }) {
  const [horizon, setHorizon] = useState<ReactionHorizon>('1d');
  const hist = ei.earnings_history;
  const rs = ei.reaction_summary;
  const cov = ei.source_status.coverage;

  if (!cov.has_reactions) {
    return <Empty msg="Earnings price reaction data is not available for this symbol." C={C} />;
  }

  const getHorizonVal = (q: EarningsQuarter): number | null => {
    const pr = q.price_reaction;
    if (!pr) return null;
    if (horizon === '1d') return pr.reaction_1d_pct;
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

  const horizonObs = (horizon === '1d' ? rs?.observations_1d : horizon === '3d' ? rs?.observations_3d : rs?.observations_5d) ?? null;
  const horizonAvg = (horizon === '1d' ? rs?.average_1d_pct : horizon === '3d' ? rs?.average_3d_pct : rs?.average_5d_pct) ?? null;
  const interval = chartData.length > 14 ? Math.floor(chartData.length / 8) : 0;

  const ReactTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const q: EarningsQuarter = d._q;
    const pr = q.price_reaction;
    return (
      <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 12px', fontSize: 10, fontFamily: _f, maxWidth: 270 }}>
        <div style={{ color: '#0ea5e9', fontWeight: 800, marginBottom: 4 }}>{label} · {fmtDate(q.date)}</div>
        {q.timing && <KV k="Timing"       v={TIMING_FULL[q.timing] ?? q.timing} />}
        {q.revenue_surprise_pct != null && <KV k="Rev Surprise"  v={fmtPct(q.revenue_surprise_pct)} vc={(q.revenue_surprise_pct ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        {q.eps_surprise_pct != null && Math.abs(q.eps_surprise_pct) < 600 && <KV k="EPS Surprise" v={fmtPct(q.eps_surprise_pct)} vc={(q.eps_surprise_pct ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        {pr?.opening_gap_pct != null  && <KV k="Opening Gap"  v={fmtPct(pr.opening_gap_pct)}  vc={(pr.opening_gap_pct  ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        {pr?.reaction_1d_pct != null  && <KV k="1D"           v={fmtPct(pr.reaction_1d_pct)}  vc={(pr.reaction_1d_pct  ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        {pr?.reaction_3d_pct != null  && <KV k="3D"           v={fmtPct(pr.reaction_3d_pct)}  vc={(pr.reaction_3d_pct  ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        {pr?.reaction_5d_pct != null  && <KV k="5D"           v={fmtPct(pr.reaction_5d_pct)}  vc={(pr.reaction_5d_pct  ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />}
        {pr?.max_upside_5d_pct != null   && <KV k="Max Upside"  v={fmtPct(pr.max_upside_5d_pct)}   vc="#22c55e" />}
        {pr?.max_drawdown_5d_pct != null && <KV k="Max Drawdown" v={fmtPct(pr.max_drawdown_5d_pct)} vc="#ef4444" />}
        {pr?.calculation_method && <KV k="Method" v={pr.calculation_method} vc="#a9aaa6" />}
        {pr && <KV k="Status" v={pr.reactions_final ? 'Final' : 'Preliminary'} vc={pr.reactions_final ? '#22c55e' : '#f59e0b'} />}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary */}
      {rs && (
        <GCard C={C}>
          <SecLabel text="Historical Summary" C={C} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Avg Move',   val: fmtPct(horizonAvg), obs: horizonObs },
              { label: 'Median 1D',  val: fmtPct(rs.median_1d_pct), obs: rs.observations_1d },
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

      {/* Horizon selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        {(['1d', '3d', '5d'] as ReactionHorizon[]).map(h => (
          <button key={h} onClick={() => setHorizon(h)}
            style={{ padding: '3px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _f, cursor: 'pointer',
              background: horizon === h ? C.teal : 'transparent', color: horizon === h ? '#000' : C.dim, border: `1px solid ${horizon === h ? C.teal : C.border}` }}>
            {h.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Reaction chart */}
      {chartData.length > 0 ? (
        <GCard C={C}>
          <SecLabel text={`Earnings Reaction — ${horizon.toUpperCase()}`} C={C} />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#a9aaa6', fontFamily: _f }} axisLine={false} tickLine={false} interval={interval} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 8, fill: '#a9aaa6', fontFamily: _f }} axisLine={false} tickLine={false} width={38} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
              <RechartTooltip content={<ReactTooltip />} />
              <Bar dataKey="val" name={horizon.toUpperCase()} radius={[2,2,0,0]} maxBarSize={28}>
                {chartData.map((d, i) => <Cell key={i} fill={(d.val ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GCard>
      ) : (
        <Empty msg="No reaction data available for the selected horizon." C={C} />
      )}

      {/* Reaction table */}
      <GCard C={C}>
        <SecLabel text="Reaction History" C={C} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: _f }}>
            <thead>
              <tr>
                {['Quarter','Timing','Rev Surp','EPS Surp','Gap','1D','3D','5D','Max Up','Max Dn','Status'].map(h => (
                  <th key={h} style={{ padding: '4px 7px', textAlign: 'left', color: C.dim, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hist.map((q, i) => {
                const pr = q.price_reaction;
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
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.opening_gap_pct ?? null, C) }}>{pr?.opening_gap_pct != null ? fmtPct(pr.opening_gap_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.reaction_1d_pct ?? null, C) }}>{pr?.reaction_1d_pct != null ? fmtPct(pr.reaction_1d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.reaction_3d_pct ?? null, C) }}>{pr?.reaction_3d_pct != null ? fmtPct(pr.reaction_3d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: pctCol(pr?.reaction_5d_pct ?? null, C) }}>{pr?.reaction_5d_pct != null ? fmtPct(pr.reaction_5d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: C.green }}>{pr?.max_upside_5d_pct != null ? fmtPct(pr.max_upside_5d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: C.red }}>{pr?.max_drawdown_5d_pct != null ? fmtPct(pr.max_drawdown_5d_pct) : '—'}</td>
                    <td style={{ padding: '4px 7px', color: statusCol, whiteSpace: 'nowrap' }}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GCard>

      {/* Methodology note */}
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
    { key: 'Low',     val: pt?.low ?? null,     color: '#ef4444' },
    { key: 'Median',  val: pt?.median ?? null,   color: '#f5f5f0' },
    { key: 'Avg',     val: pt?.average ?? null,  color: '#0ea5e9' },
    { key: 'High',    val: pt?.high ?? null,     color: '#22c55e' },
    { key: 'Current', val: currentPrice,         color: '#f59e0b' },
  ].filter(p => p.val != null);

  const actionVerb = (a: RatingAction): string => {
    if (a.action === 'maintain')  return `Maintains ${a.new_grade ?? ''}`.trim();
    if (a.action === 'upgrade')   return `Upgrades to ${a.new_grade ?? ''}`.trim();
    if (a.action === 'downgrade') return `Downgrades to ${a.new_grade ?? ''}`.trim();
    if (a.action === 'initiate')  return `Initiates ${a.new_grade ?? ''}`.trim();
    if (a.action === 'reiterate') return `Reiterates ${a.new_grade ?? ''}`.trim();
    return [a.action, a.new_grade].filter(Boolean).join(' ');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* A. Consensus */}
      <GCard C={C}>
        <SecLabel text="Analyst Consensus" C={C} />
        {cons ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 900, fontFamily: _f, color: consensusCol(cons.consensus_label) }}>{cons.consensus_label}</span>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: _f }}>{cons.total_ratings} analysts</span>
            </div>
            {/* Distribution bar */}
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
              {([
                { v: cons.strong_buy, c: '#22c55e' }, { v: cons.buy, c: '#4ade80' },
                { v: cons.hold, c: '#f59e0b' }, { v: cons.sell, c: '#f87171' }, { v: cons.strong_sell, c: '#ef4444' },
              ] as { v: number; c: string }[]).filter(s => s.v > 0).map((s, i) => (
                <div key={i} style={{ flex: s.v, background: s.c }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
          {/* Rail */}
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
              { label: 'Last Month', avg: pts.last_month_average, count: pts.last_month_count },
              { label: 'Last Quarter', avg: pts.last_quarter_average, count: pts.last_quarter_count },
              { label: 'Last Year', avg: pts.last_year_average, count: pts.last_year_count },
              { label: 'All Time', avg: pts.all_time_average, count: pts.all_time_count },
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

      {/* D. Monthly distribution */}
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
              <Bar dataKey="strong_buy" name="Strong Buy"  stackId="a" fill="#22c55e" />
              <Bar dataKey="buy"        name="Buy"         stackId="a" fill="#4ade80" />
              <Bar dataKey="hold"       name="Hold"        stackId="a" fill="#f59e0b" />
              <Bar dataKey="sell"       name="Sell"        stackId="a" fill="#f87171" />
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
            {actions.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < actions.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: _s, color: C.text }}>{a.firm}</div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: _s, marginTop: 1 }}>{actionVerb(a)}</div>
                </div>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: _f, whiteSpace: 'nowrap' }}>{fmtDate(a.date)}</div>
              </div>
            ))}
          </div>
        </GCard>
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
}

export function EarningsTab({ detail, detailLoading, currentPrice }: EarningsTabProps) {
  const { C } = useTheme();
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const ei: EarningsIntelligence | null = detail?.earnings_intelligence ?? null;

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

      {subTab === 'overview'     && <OverviewSubTab    ei={ei} C={C} />}
      {subTab === 'history'      && <HistorySubTab     ei={ei} C={C} />}
      {subTab === 'price-moves'  && <PriceMovesSubTab  ei={ei} C={C} />}
      {subTab === 'ratings'      && <RatingsSubTab     ei={ei} currentPrice={currentPrice} C={C} />}
    </div>
  );
}
