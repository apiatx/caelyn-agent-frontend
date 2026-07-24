import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  LiveEarningsEvent,
  LiveEarningsClassification,
  LiveResultsSummary,
  LiveFilingSummary,
  LiveMarketReaction,
} from '@/types/live-earnings';

const _f = "'JetBrains Mono','Fira Code',monospace";
const _s = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─── Normalizers ──────────────────────────────────────────────────────────────

function getResults(e: LiveEarningsEvent): LiveResultsSummary | null {
  return (e.results_payload as LiveResultsSummary | null | undefined) ?? e.results_summary ?? null;
}
function getFiling(e: LiveEarningsEvent): LiveFilingSummary | null {
  return (e.filing_payload as LiveFilingSummary | null | undefined) ?? e.filing_summary ?? null;
}
function getReaction(e: LiveEarningsEvent): LiveMarketReaction | null {
  return (e.reaction_payload as LiveMarketReaction | null | undefined) ?? e.initial_market_reaction ?? null;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtEps(v: number | null): string {
  if (v == null || !isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`;
}
function fmtRev(v: number | null): string {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (a >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3)  return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
function fmtPct(v: number | null): string {
  if (v == null || !isFinite(v)) return '';
  return ` (${v >= 0 ? '+' : ''}${v.toFixed(1)}%)`;
}
function fmtTs(iso: string | null): string {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'just now';
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
function fmtDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US',
      { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  } catch { return d; }
}
function fmtEtTime(isoStr: string | null | undefined): string | null {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) + ' ET';
  } catch { return null; }
}
function todayEt(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

// ─── Timing label ─────────────────────────────────────────────────────────────

function timingLabel(t: string | null | undefined): string {
  if (!t) return 'Timing Not Confirmed';
  switch (t.toLowerCase()) {
    case 'bmo': case 'before_open': case 'before_market': return 'Before Market Open';
    case 'amc': case 'after_close': case 'after_market': return 'After Market Close';
    case 'during_market': case 'during': return 'During Market Hours';
    default: return 'Timing Not Confirmed';
  }
}

// ─── Classification config ────────────────────────────────────────────────────

interface ClassCfg { label: string; headline: string; color: string; bg: string; border: string; }
function classCfg(cl: LiveEarningsClassification | null, C: any): ClassCfg {
  switch (cl) {
    case 'double_beat':
      return { label: 'Double Beat', headline: 'Double beat reported', color: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.35)' };
    case 'double_miss':
      return { label: 'Double Miss', headline: 'Double miss reported', color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.35)' };
    case 'mixed':
      return { label: 'Mixed Results', headline: 'Mixed earnings results', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.35)' };
    case 'partial':
      return { label: 'Partial Results', headline: 'Partial results reported', color: '#f59e0b', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.30)' };
    default:
      return { label: 'Results Reported', headline: 'Earnings results reported', color: C.teal, bg: 'rgba(14,165,233,0.05)', border: 'rgba(14,165,233,0.25)' };
  }
}

// ─── CardShell ────────────────────────────────────────────────────────────────

function CardShell({ bg, border, children }: { bg: string; border: string; children: React.ReactNode }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ label, color, pulse }: { label: string; color: string; pulse?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {pulse && (
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, animation: 'lec-pulse 1.8s ease-in-out infinite' }} />
      )}
      <span style={{ fontSize: 9, fontWeight: 800, fontFamily: _f, color, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
        {label}
      </span>
    </div>
  );
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(expectedAt: string | null | undefined): { label: string | null; overdue: boolean } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expectedAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [expectedAt]);
  if (!expectedAt) return { label: null, overdue: false };
  const diff = new Date(expectedAt).getTime() - now;
  if (diff <= 0) return { label: null, overdue: true };
  const totalMins = Math.ceil(diff / 60_000);
  if (totalMins < 60) return { label: `Reports in ${totalMins}m`, overdue: false };
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return { label: mins > 0 ? `Reports in ${hrs}h ${mins}m` : `Reports in ${hrs}h`, overdue: false };
}

// ─── MetricRow ────────────────────────────────────────────────────────────────

function MetricRow({ label, actual, estimate, surpriseAmt, surprisePct, pending, C }: {
  label: string; actual: string; estimate?: string | null; surpriseAmt?: string | null;
  surprisePct?: number | null; pending?: boolean; C: any;
}) {
  const surpriseColor = (pct: number | null) => pct == null ? C.text : pct >= 0 ? '#22c55e' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' as const }}>
      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.dim, minWidth: 48, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{label}</span>
      {pending ? (
        <span style={{ fontSize: 10, fontFamily: _f, color: C.dim, fontStyle: 'italic' }}>Pending</span>
      ) : (
        <>
          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: _f, color: C.bright }}>{actual}</span>
          {estimate && <span style={{ fontSize: 9, fontFamily: _f, color: C.dim }}>est. {estimate}</span>}
          {surpriseAmt && (
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: _f, color: surpriseColor(surprisePct ?? null) }}>
              {surpriseAmt}{fmtPct(surprisePct ?? null)}
            </span>
          )}
        </>
      )}
    </div>
  );
}

// ─── MarketReactionRow ────────────────────────────────────────────────────────

function MarketReactionRow({ event, C }: { event: LiveEarningsEvent; C: any }) {
  const mr = getReaction(event);
  if (!mr || mr.move_pct == null) return null;
  const col = mr.move_pct >= 0 ? '#22c55e' : '#ef4444';
  const sessionLabel =
    mr.session === 'premarket' ? 'Premarket' :
    mr.session === 'afterhours' ? 'After Hours' :
    mr.session === 'regular' ? 'Regular' : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6, borderTop: `1px solid rgba(255,255,255,0.06)`, flexWrap: 'wrap' as const }}>
      <span style={{ fontSize: 9, color: C.dim, fontFamily: _f, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Market</span>
      <span style={{ fontSize: 14, fontWeight: 900, fontFamily: _f, color: col }}>{mr.move_pct >= 0 ? '+' : ''}{mr.move_pct.toFixed(1)}%</span>
      {mr.price != null && <span style={{ fontSize: 10, color: C.text, fontFamily: _f }}>${mr.price.toFixed(2)}</span>}
      {sessionLabel && <span style={{ fontSize: 9, color: C.dim, fontFamily: _s }}>{sessionLabel}</span>}
      {mr.is_preliminary && (
        <span style={{ fontSize: 8, fontWeight: 700, fontFamily: _f, color: C.amber, border: `1px solid ${C.amber}40`, padding: '1px 5px', borderRadius: 3 }}>PRELIMINARY</span>
      )}
      {mr.timestamp && <span style={{ fontSize: 8, color: C.dim, fontFamily: _s, marginLeft: 'auto' }}>{fmtTs(mr.timestamp)}</span>}
    </div>
  );
}

// ─── ScheduleBlock ────────────────────────────────────────────────────────────

function ScheduleBlock({ event, countdown, overdue, C }: {
  event: LiveEarningsEvent; countdown: string | null; overdue: boolean; C: any;
}) {
  const etTime = fmtEtTime(event.expected_at);
  const timing = event.expected_timing;
  const status = event.report_time_status;
  const timingKnown = timing && timing.toLowerCase() !== 'unknown';
  const timingStr = timingKnown ? timingLabel(timing) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {event.expected_date && (
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: _f, color: C.text }}>
          {fmtDate(event.expected_date)}
        </span>
      )}
      {etTime ? (
        <>
          <span style={{ fontSize: 11, fontFamily: _f, color: C.text }}>
            {status === 'estimated' ? `Est. ${etTime}` : etTime}
          </span>
          {timingStr && (
            <span style={{ fontSize: 10, color: C.dim, fontFamily: _s }}>{timingStr}</span>
          )}
          {(status === 'confirmed' || status === 'estimated') && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: _s }}>
              {status === 'confirmed' ? 'Confirmed time' : 'Estimated time'}
            </span>
          )}
        </>
      ) : (
        <>
          {timingStr ? (
            <>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: _s }}>{timingStr}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: _s }}>Exact time unavailable</span>
            </>
          ) : (
            <span style={{ fontSize: 10, color: C.dim, fontFamily: _s }}>Timing not confirmed</span>
          )}
        </>
      )}
      {countdown && !overdue && (
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: _f, color: '#f59e0b', marginTop: 2 }}>{countdown}</span>
      )}
      {overdue && (
        <span style={{ fontSize: 10, color: '#f59e0b', fontFamily: _s, marginTop: 2 }}>
          Awaiting release · Monitoring for results
        </span>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface LiveEarningsCardProps {
  event: LiveEarningsEvent;
  onOpenMaterials?: () => void;
}

export function LiveEarningsCard({ event, onOpenMaterials }: LiveEarningsCardProps) {
  const { C } = useTheme();

  // Hooks must always be called at the top level regardless of state
  const { label: countdown, overdue } = useCountdown(event.expected_at);

  useMemo(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('lec-styles')) return;
    const s = document.createElement('style');
    s.id = 'lec-styles';
    s.textContent = `@keyframes lec-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.75); } }`;
    document.head.appendChild(s);
  }, []);

  const st = event.state;
  const rs = getResults(event);
  const fs = getFiling(event);

  // ── scheduled ──────────────────────────────────────────────────────────────
  if (st === 'scheduled') {
    const isToday_flag = event.expected_date === todayEt();
    return (
      <CardShell bg="rgba(255,255,255,0.02)" border="rgba(255,255,255,0.1)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          <Badge
            label={isToday_flag ? 'Earnings Today' : 'Upcoming Earnings'}
            color={isToday_flag ? '#f59e0b' : C.dim}
          />
        </div>
        <ScheduleBlock event={event} countdown={countdown} overdue={overdue} C={C} />
      </CardShell>
    );
  }

  // ── monitoring ─────────────────────────────────────────────────────────────
  if (st === 'monitoring') {
    return (
      <CardShell bg="rgba(245,158,11,0.04)" border="rgba(245,158,11,0.25)">
        <Badge label="Live Earnings" color="#f59e0b" pulse />
        <ScheduleBlock event={event} countdown={countdown} overdue={overdue} C={C} />
      </CardShell>
    );
  }

  // ── filing_detected ────────────────────────────────────────────────────────
  if (st === 'filing_detected') {
    return (
      <CardShell bg="rgba(245,158,11,0.06)" border="rgba(245,158,11,0.40)">
        <Badge label="Release Detected" color="#f59e0b" pulse />
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: _f, color: '#fff' }}>Earnings Materials Detected</div>
        <div style={{ fontSize: 10, color: '#f59e0b', fontFamily: _s }}>Structured results processing</div>
        {event.detected_at && (
          <div style={{ fontSize: 10, color: C.dim, fontFamily: _s }}>Detected {fmtTs(event.detected_at)}</div>
        )}
        {fs && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
            {fs.form && (
              <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: '#fff', background: 'rgba(245,158,11,0.2)', padding: '2px 7px', borderRadius: 3 }}>{fs.form}</span>
            )}
            {fs.sec_accepted_at && (
              <span style={{ fontSize: 9, color: C.dim, fontFamily: _s }}>SEC accepted {fmtTs(fs.sec_accepted_at)}</span>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 2 }}>
          {onOpenMaterials && (
            <button
              onClick={onOpenMaterials}
              style={{ fontSize: 9, fontWeight: 800, fontFamily: _f, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}
            >
              View Materials
            </button>
          )}
          {fs?.url && (
            <a
              href={fs.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.dim, background: 'transparent', border: `1px solid rgba(255,255,255,0.12)`, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}
            >
              Open Filing ↗
            </a>
          )}
        </div>
      </CardShell>
    );
  }

  // ── results_partial ────────────────────────────────────────────────────────
  if (st === 'results_partial') {
    const hasEps = rs?.eps_actual != null;
    const hasRev = rs?.revenue_actual != null;
    return (
      <CardShell bg="rgba(245,158,11,0.06)" border="rgba(245,158,11,0.40)">
        <Badge label="Partial Results" color="#f59e0b" pulse />
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: _f, color: '#fff' }}>Partial Results Available</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <MetricRow
            label="EPS" actual={hasEps ? fmtEps(rs!.eps_actual) : '—'}
            estimate={hasEps && rs?.eps_estimate != null ? fmtEps(rs!.eps_estimate) : null}
            surpriseAmt={hasEps && rs?.eps_surprise_amount != null ? fmtEps(rs!.eps_surprise_amount) : null}
            surprisePct={hasEps ? (rs?.eps_surprise_pct ?? null) : null}
            pending={!hasEps} C={C}
          />
          <MetricRow
            label="Revenue" actual={hasRev ? fmtRev(rs!.revenue_actual) : '—'}
            estimate={hasRev && rs?.revenue_estimate != null ? fmtRev(rs!.revenue_estimate) : null}
            surpriseAmt={hasRev && rs?.revenue_surprise_amount != null ? fmtRev(rs!.revenue_surprise_amount) : null}
            surprisePct={hasRev ? (rs?.revenue_surprise_pct ?? null) : null}
            pending={!hasRev} C={C}
          />
        </div>
        {event.detected_at && (
          <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 2 }}>Detected {fmtTs(event.detected_at)}</div>
        )}
        <MarketReactionRow event={event} C={C} />
      </CardShell>
    );
  }

  // ── results_available ──────────────────────────────────────────────────────
  if (st === 'results_available') {
    const cfg = classCfg(event.classification, C);
    return (
      <CardShell bg={cfg.bg} border={cfg.border}>
        <Badge label={cfg.label} color={cfg.color} />
        <div style={{ fontSize: 13, fontWeight: 800, fontFamily: _f, color: cfg.color }}>{cfg.headline}</div>
        {rs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <MetricRow
              label="EPS" actual={fmtEps(rs.eps_actual)}
              estimate={rs.eps_estimate != null ? fmtEps(rs.eps_estimate) : null}
              surpriseAmt={rs.eps_surprise_amount != null ? fmtEps(rs.eps_surprise_amount) : null}
              surprisePct={rs.eps_surprise_pct} C={C}
            />
            <MetricRow
              label="Revenue" actual={fmtRev(rs.revenue_actual)}
              estimate={rs.revenue_estimate != null ? fmtRev(rs.revenue_estimate) : null}
              surpriseAmt={rs.revenue_surprise_amount != null ? fmtRev(rs.revenue_surprise_amount) : null}
              surprisePct={rs.revenue_surprise_pct} C={C}
            />
          </div>
        )}
        <MarketReactionRow event={event} C={C} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center', fontSize: 9, color: C.dim, fontFamily: _s }}>
          {event.detected_at && <span>Detected {fmtTs(event.detected_at)}</span>}
          <span>Updated {fmtTs(event.updated_at)}</span>
        </div>
        {fs?.url && (
          <a href={fs.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: cfg.color, textDecoration: 'underline', cursor: 'pointer' }}>
            Open Filing ↗
          </a>
        )}
      </CardShell>
    );
  }

  // ── results_updated ────────────────────────────────────────────────────────
  if (st === 'results_updated') {
    const cfg = classCfg(event.classification, C);
    return (
      <CardShell bg="rgba(14,165,233,0.05)" border="rgba(14,165,233,0.30)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge label="Updated" color={C.teal} />
          <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: C.dim }}>rev {event.revision}</span>
          {event.classification && (
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: cfg.color }}>{cfg.label}</span>
          )}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: _f, color: '#fff' }}>Earnings Results Updated</div>
        {rs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <MetricRow
              label="EPS" actual={fmtEps(rs.eps_actual)}
              estimate={rs.eps_estimate != null ? fmtEps(rs.eps_estimate) : null}
              surpriseAmt={rs.eps_surprise_amount != null ? fmtEps(rs.eps_surprise_amount) : null}
              surprisePct={rs.eps_surprise_pct} C={C}
            />
            <MetricRow
              label="Revenue" actual={fmtRev(rs.revenue_actual)}
              estimate={rs.revenue_estimate != null ? fmtRev(rs.revenue_estimate) : null}
              surpriseAmt={rs.revenue_surprise_amount != null ? fmtRev(rs.revenue_surprise_amount) : null}
              surprisePct={rs.revenue_surprise_pct} C={C}
            />
          </div>
        )}
        <div style={{ fontSize: 9, color: C.dim, fontFamily: _s, marginTop: 2, fontStyle: 'italic' }}>Figures revised after initial publication</div>
        <MarketReactionRow event={event} C={C} />
        <div style={{ fontSize: 9, color: C.dim, fontFamily: _s }}>Updated {fmtTs(event.updated_at)}</div>
      </CardShell>
    );
  }

  // ── complete (and unknown fallback) ────────────────────────────────────────
  const cfg = classCfg(event.classification, C);
  return (
    <CardShell bg="rgba(255,255,255,0.02)" border="rgba(255,255,255,0.10)">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge label="Complete" color={C.dim} />
        {event.classification && (
          <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: cfg.color }}>{cfg.label}</span>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: _f, color: C.text }}>Earnings Event Complete</div>
      {rs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <MetricRow label="EPS" actual={fmtEps(rs.eps_actual)} C={C} />
          <MetricRow label="Revenue" actual={fmtRev(rs.revenue_actual)} C={C} />
        </div>
      )}
      <div style={{ fontSize: 9, color: C.dim, fontFamily: _s }}>Last updated {fmtTs(event.updated_at)}</div>
    </CardShell>
  );
}
