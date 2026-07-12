import { useState, useMemo } from 'react';

/* ── Color palette matches watchlist.tsx ─────────────────────────── */
const CC = {
  bg: '#020202', surface: '#0a0a0a', card: '#111114',
  border: 'rgba(255,255,255,0.10)', text: '#f5f5f0', dim: '#a9aaa6',
  teal: '#0ea5e9', green: '#22c55e', red: '#ef4444',
  amber: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
  orange: '#fb923c',
  font: "'JetBrains Mono','Fira Code',monospace",
};

/* ─── Shared type helpers ────────────────────────────────────────── */

function stageMeta(row: any) {
  const s = row?.stage2_breakout ?? row?.stage_analysis ?? {};
  return { score: (s.score ?? 0) as number, label: (s.label ?? '') as string, tm: (s.technical_metrics ?? {}) as Record<string, any> };
}

/* ── Active Support Zone ─────────────────────────────────────────── */

interface ActiveSupportInfo {
  status: string | null;
  displayLabel: string;
  displaySubNote: string | null;
  zone: any;
  zoneDisplay: string;
  criticalBreak: number | null;
  reclaim: number | null;
  nextDownside: number | null;
  priorPivotStatus: string | null;
  priorPivotLevel: number | null;
  lowerLowConfirmed: boolean;
  majorSupportLost: boolean;
  structureState: string | null;
  isConfirmedLoss: boolean;
  hasActiveSupport: boolean;
}

function fmtZone(zone: any): string {
  if (zone == null) return '';
  if (typeof zone === 'number') return zone.toFixed(2);
  if (typeof zone === 'string') return zone;
  if (typeof zone === 'object') {
    const low  = zone.low  ?? zone.min   ?? zone.lower   ?? null;
    const high = zone.high ?? zone.max   ?? zone.upper   ?? null;
    const mid  = zone.mid  ?? zone.midpoint ?? zone.value ?? null;
    if (low != null && high != null) return `${Number(low).toFixed(2)} – ${Number(high).toFixed(2)}`;
    if (mid != null) return Number(mid).toFixed(2);
  }
  return String(zone);
}

function getActiveSupportInfo(row: any): ActiveSupportInfo {
  const status          = (row.active_support_status ?? null) as string | null;
  const priorPivotStatus= (row.prior_pivot_status   ?? null) as string | null;
  const lowerLowConfirmed = row.lower_low_confirmed === true;
  const majorSupportLost  = row.major_support_lost  === true;
  const structureState  = (row.structure_state ?? null) as string | null;
  const zone            = row.active_support_zone ?? null;
  const criticalBreak   = row.critical_break_level != null ? Number(row.critical_break_level) : null;
  const reclaim         = row.reclaim_level         != null ? Number(row.reclaim_level)         : null;
  const nextDownside    = row.next_downside_support  != null ? Number(row.next_downside_support)  : null;
  const priorPivotLevel = row.prior_pivot_level      != null ? Number(row.prior_pivot_level)      : null;

  const hasActiveSupport = status !== null || zone !== null || criticalBreak !== null || reclaim !== null || structureState !== null;

  const statusLabelMap: Record<string, string> = {
    above_support:        'Active support intact',
    testing_support:      'Testing active support',
    bounced_from_support: 'Bounced from active support',
    broken_unconfirmed:   'Support break unconfirmed',
    lost_confirmed:       'Confirmed support lost',
  };
  const displayLabel = status ? (statusLabelMap[status] ?? status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())) : '';

  let displaySubNote: string | null = null;
  if (priorPivotStatus === 'lost_now_overhead' && status !== 'lost_confirmed') {
    displaySubNote = reclaim != null
      ? `Prior pivot lost; reclaim needed at ${reclaim.toFixed(2)}`
      : 'Prior pivot lost; reclaim needed';
  }

  const isConfirmedLoss = status === 'lost_confirmed' || lowerLowConfirmed || majorSupportLost;

  return {
    status, displayLabel, displaySubNote,
    zone, zoneDisplay: fmtZone(zone),
    criticalBreak, reclaim, nextDownside,
    priorPivotStatus, priorPivotLevel,
    lowerLowConfirmed, majorSupportLost, structureState,
    isConfirmedLoss, hasActiveSupport,
  };
}

/* ─── Investment score helpers ───────────────────────────────────── */

function getInvScore(row: any): number | null {
  const v = row.investment_alignment_score ?? row.investment_alignment?.score ?? null;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

function getInvUnavailableReason(row: any): string {
  const reason = row.investment_alignment?.unavailable_reason ?? row.investment_unavailable_reason ?? null;
  const map: Record<string, string> = {
    fundamentals_missing:          'fundamentals missing',
    insufficient_data:             'insufficient data',
    not_in_investment_universe:    'not in investment universe',
    cache_missing:                 'cache missing',
    unknown:                       'unknown reason',
  };
  return reason ? (map[reason] ?? reason) : 'reason not provided';
}

/* ─── Trade score ────────────────────────────────────────────────── */

export function deriveTrade(row: any): number {
  const { score: stageScore, tm } = stageMeta(row);
  const timing = typeof tm.technical_timing_score === 'number' ? tm.technical_timing_score : 50;
  const volx   = typeof row.relative_volume === 'number' ? row.relative_volume : 0;
  const volxS  = volx >= 5 ? 100 : volx >= 3 ? 88 : volx >= 2 ? 72 : volx >= 1.5 ? 58 : volx >= 1.2 ? 45 : Math.min(40, volx * 30);
  const volMc  = typeof row.vol_mc_pct === 'number' ? row.vol_mc_pct : 0;
  const volMcS = volMc >= 15 ? 100 : volMc >= 8 ? 80 : volMc >= 4 ? 60 : volMc >= 2 ? 40 : Math.min(35, volMc * 10);
  const optS   = row.options_score != null && Number.isFinite(Number(row.options_score)) ? Number(row.options_score) : 50;
  return Math.round(timing * 0.30 + volxS * 0.25 + volMcS * 0.20 + optS * 0.15 + stageScore * 0.10);
}

function getTradeScore(row: any): number {
  const be = row.trade_alignment_score ?? row.actionability?.trade_score ?? null;
  if (be != null && Number.isFinite(Number(be))) return Math.round(Number(be));
  return deriveTrade(row);
}

/* ─── Catalyst ───────────────────────────────────────────────────── */

interface CatInfo {
  event: any; eventTitle: string; source: string | null; score: number | null;
  bearish: any; pBoost: number | null; published: string | null; state: string | null; eventType: string | null;
}

function getCatalystInfo(row: any): CatInfo | null {
  const event =
    row.catalyst_primary_event   || row.catalyst_rss_event    || row.catalyst_scheduled_event  || row.catalyst_v2_primary_event   ||
    row.catalyst?.primary_event  || row.catalyst?.rss_event   || row.catalyst?.scheduled_event || row.catalyst?.v2_primary_event  ||
    null;
  if (!event) return null;
  const score = row.catalyst_alignment_score ?? row.catalyst?.alignment_score ?? row.catalyst_v2_score ?? row.catalyst?.score ?? null;
  return {
    event,
    eventTitle: fmtCatalystEvent(event),
    source: row.catalyst_primary_source ?? row.catalyst?.primary_source ?? row.catalyst_v2_state ?? row.catalyst?.state ?? null,
    score: score != null ? Number(score) : null,
    bearish: row.catalyst_bearish_conflict || row.catalyst?.bearish_conflict ||
      (Array.isArray(row.catalyst_v2_conflicts) && row.catalyst_v2_conflicts.length > 0 ? row.catalyst_v2_conflicts[0] : null) || null,
    pBoost: row.catalyst?.theme_policy_boost != null ? Number(row.catalyst.theme_policy_boost)
      : row.theme_policy_boost != null ? Number(row.theme_policy_boost) : null,
    published: row.catalyst_rss_published ?? row.catalyst?.published ?? row.catalyst?.rss_published ?? null,
    state: row.catalyst_v2_state ?? row.catalyst?.state ?? null,
    eventType: row.catalyst_event_type ?? row.catalyst?.event_type ?? null,
  };
}

/* ─── Theme Policy ───────────────────────────────────────────────── */

interface PolicyInfo { available: boolean; boost: number; theme: string | null; event: string | null; score: number | null; reasonCodes: string[] }

function getThemePolicyInfo(row: any): PolicyInfo {
  const flat   = row.theme_policy_available === true || (row.theme_policy_boost && Number(row.theme_policy_boost) > 0) || !!row.theme_policy_event;
  const nested = row.catalyst?.theme_policy_boost && Number(row.catalyst.theme_policy_boost) > 0;
  if (flat || nested) {
    const boost = Number(row.theme_policy_boost ?? row.catalyst?.theme_policy_boost ?? 0);
    return {
      available: true, boost,
      theme: row.theme_policy_theme ?? row.catalyst?.theme_policy_theme ?? null,
      event: row.theme_policy_event ?? row.catalyst?.theme_policy_event ?? null,
      score: row.theme_policy_score != null ? Number(row.theme_policy_score)
        : row.catalyst?.theme_policy_score != null ? Number(row.catalyst.theme_policy_score) : null,
      reasonCodes: row.theme_policy_reason_codes ?? row.catalyst?.theme_policy_reason_codes ?? [],
    };
  }
  return { available: false, boost: 0, theme: null, event: null, score: null, reasonCodes: [] };
}

/* ─── Options ────────────────────────────────────────────────────── */

interface OptionsInfo { primarySig: string | null; sigLabel: string | null; alignScore: number | null; entryConflict: boolean; setupSummary: string | null }

function getOptionsInfo(row: any): OptionsInfo {
  const rawSig = row.options?.primary_signal ?? row.actionability?.options_primary_signal ?? row.options_signal ?? null;
  const primarySig = rawSig && rawSig !== 'NO DATA' ? (rawSig as string) : null;
  const alignScore = row.options_alignment_score ?? row.options?.alignment_score ?? row.options_score ?? null;
  return {
    primarySig,
    sigLabel: primarySig ? fmtOptionsSig(primarySig) : null,
    alignScore: alignScore != null && Number.isFinite(Number(alignScore)) ? Number(alignScore) : null,
    entryConflict: row.actionability?.options_entry_conflict === true,
    setupSummary: row.actionability?.setup_summary ?? null,
  };
}

function fmtOptionsSig(sig: string): string {
  const map: Record<string, string> = {
    asymmetric_rr: 'Asymmetric RR', bullish_flow: 'Bullish flow', bearish_flow: 'Bearish flow',
    neutral: 'Neutral', protective_puts: 'Protective puts', call_spread: 'Call spread',
    put_spread: 'Put spread', unusual_calls: 'Unusual calls', unusual_puts: 'Unusual puts',
  };
  return map[sig] ?? sig.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

/* ─── Entry state — active support first, then backend, then derived ─ */

function rawEntryState(row: any): string {
  return (row.entry_state ?? row.actionability?.entry_state ?? '').toUpperCase();
}

function deriveEntryState(row: any): string {
  const as = getActiveSupportInfo(row);

  /* Active support fields win over crude entry_state when present */
  if (as.hasActiveSupport) {
    if (as.status === 'lost_confirmed' || as.lowerLowConfirmed) return 'Confirmed support lost';
    if (as.status === 'above_support') return 'Active support intact';
    if (as.status === 'testing_support') return 'Testing active support';
    if (as.status === 'bounced_from_support') return 'Bounced from active support';
    if (as.status === 'broken_unconfirmed') return 'Support break unconfirmed';
  }

  /* Backend entry_state */
  const beState = rawEntryState(row);
  const beMap: Record<string, string> = {
    SUPPORT_TEST:          'Testing support',
    LOWER_HIGH_WARNING:    'Lower-high warning',
    LOWER_LOW_CONFIRMED:   'Confirmed lower low',
    SUPPORT_LOST:          'Support lost',
    FAILED_BREAKOUT:       'Failed breakout',
    BREAKOUT_BUY_ZONE:     'Breakout — buy zone',
    POTENTIAL_BREAKOUT:    'Wait for breakout',
    COILING:               'Coiling',
    BUY_ZONE:              'Buy zone',
    WAIT_ZONE:             'Wait zone',
    EXTREME_EXTENSION:     'Extreme extension',
    EXTENDED:              'Extended',
    NEUTRAL:               'Neutral',
    HEALTHY:               'Healthy',
    PULLBACK_BUY_ZONE:     'Pullback buy zone',
  };
  if (beState && beMap[beState]) return beMap[beState];
  if (beState && beState.length > 0) return beState.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

  /* Derive from technical_metrics */
  const { tm, label } = stageMeta(row);
  const bs  = (tm.breakout_signal ?? '') as string;
  const ez  = (tm.entry_zone ?? '') as string;
  const ext = (tm.extension_risk ?? '') as string;
  if (ext === 'extreme_extension') return 'Extreme extension';
  if (ext === 'extended') return 'Extended';
  if (bs === 'failed_breakout') return 'Failed breakout';
  if (bs === 'breakout' && ez === 'buy_zone') return 'Breakout — buy zone';
  if (bs === 'potential_breakout') return 'Wait for breakout';
  if (bs === 'coiling') return 'Coiling';
  if (ez === 'buy_zone') return 'Buy zone';
  if (ez === 'wait_zone') return 'Wait zone';
  if (ez === 'neutral') return 'Neutral';
  if (label) return label.split(' ').slice(0, 3).join(' ');
  return 'Unknown';
}

/* ─── Actionability — active support overrides crude entry_state ─── */

export type ActionabilityState =
  | 'READY' | 'WATCH' | 'WAIT_FOR_BREAKOUT' | 'WAIT_FOR_RETEST'
  | 'EARLY_WATCH' | 'SUPPORT_LOST' | 'TOO_EXTENDED' | 'UNKNOWN';

export function deriveActionability(row: any): ActionabilityState {
  const as   = getActiveSupportInfo(row);
  const es   = rawEntryState(row);

  /* Confirmed loss — must have active_support_status = lost_confirmed OR lower_low_confirmed OR major_support_lost */
  if (as.isConfirmedLoss) return 'SUPPORT_LOST';

  /* CRITICAL: if backend entry_state says SUPPORT_LOST / LOWER_LOW_CONFIRMED
     but active support data says it is NOT lost_confirmed → use WATCH, not SUPPORT_LOST */
  if ((es === 'LOWER_LOW_CONFIRMED' || es === 'SUPPORT_LOST') && as.hasActiveSupport && !as.isConfirmedLoss) return 'WATCH';

  /* Active support tests → WATCH, not SUPPORT_LOST */
  if (as.status === 'testing_support' || as.status === 'bounced_from_support' || as.status === 'broken_unconfirmed') return 'WATCH';
  if (es === 'SUPPORT_TEST') return 'WATCH';
  if (es === 'LOWER_HIGH_WARNING') return 'WATCH';

  const { label, tm } = stageMeta(row);
  const ext    = (tm.extension_risk ?? '') as string;
  const bs     = (tm.breakout_signal ?? '') as string;
  const ez     = (tm.entry_zone ?? '') as string;
  const timing = typeof tm.technical_timing_score === 'number' ? tm.technical_timing_score : 50;
  const optConflict = row.actionability?.options_entry_conflict === true;

  if (ext === 'extreme_extension') return 'TOO_EXTENDED';
  if (ext === 'extended' && timing < 40) return 'TOO_EXTENDED';
  if (bs === 'failed_breakout' && !as.hasActiveSupport) return 'SUPPORT_LOST';
  if (label.startsWith('S2 Breakout') && (ez === 'buy_zone' || timing >= 70) && !optConflict) return 'READY';
  if (label.startsWith('S2 Breakout')) return 'WATCH';
  if (bs === 'coiling' || ez === 'wait_zone') return 'WAIT_FOR_BREAKOUT';
  if (label.startsWith('S1-2 Watch') || label.startsWith('S1 Base')) return 'EARLY_WATCH';
  if (timing >= 60) return 'WATCH';
  return 'WATCH';
}

function actionPriority(a: ActionabilityState): number {
  const order: Record<ActionabilityState, number> = {
    READY: 0, WATCH: 1, WAIT_FOR_BREAKOUT: 2, WAIT_FOR_RETEST: 3,
    EARLY_WATCH: 4, UNKNOWN: 5, SUPPORT_LOST: 6, TOO_EXTENDED: 7,
  };
  return order[a] ?? 5;
}

/* ─── Risk severity — per spec weights ──────────────────────────── */

function riskSeverity(r: any): number {
  let sev = 0;
  const cat      = getCatalystInfo(r);
  const as       = getActiveSupportInfo(r);
  const action   = deriveActionability(r);
  const es       = rawEntryState(r);
  const { tm }   = stageMeta(r);
  const extRaw   = (r.extension_state ?? tm.extension_risk ?? '').toLowerCase().replace(/\s+/g, '_');
  const optConflict = r.actionability?.options_entry_conflict === true;

  if (cat?.bearish)                                                              sev += 100;
  if (as.status === 'lost_confirmed')                                            sev +=  95;
  if (as.lowerLowConfirmed)                                                      sev +=  90;
  if (action === 'SUPPORT_LOST' || action === 'TOO_EXTENDED')                    sev +=  90;
  if (['extreme_extension','vertical','crowded_move'].includes(extRaw))          sev +=  85;
  if (optConflict)                                                               sev +=  80;
  if (as.status === 'broken_unconfirmed')                                        sev +=  75;
  if (es === 'LOWER_HIGH_WARNING')                                               sev +=  60;
  if (as.priorPivotStatus === 'lost_now_overhead' && as.status !== 'lost_confirmed') sev += 45;
  if (es === 'SUPPORT_TEST' || as.status === 'testing_support')                  sev +=  35;

  return sev;
}

/* ─── Why / Why Not Now ──────────────────────────────────────────── */

function deriveWhy(row: any, action: ActionabilityState, tradeScore: number): string {
  const setupSummary = row.actionability?.setup_summary ?? null;
  if (setupSummary && typeof setupSummary === 'string') return setupSummary;

  const { label }  = stageMeta(row);
  const inv        = getInvScore(row);
  const cat        = getCatalystInfo(row);
  const as         = getActiveSupportInfo(row);
  const es         = rawEntryState(row);
  const policy     = getThemePolicyInfo(row);
  const opts       = getOptionsInfo(row);

  if (action === 'READY' && !opts.entryConflict)
    return `Actionable now — ${label} stage with constructive entry and ${tradeScore >= 75 ? 'high' : 'moderate'} trade signal (${tradeScore}).`;
  if (action === 'TOO_EXTENDED')
    return 'Extended beyond normal range — waiting for pullback or base formation reduces entry risk.';
  if (as.isConfirmedLoss)
    return as.lowerLowConfirmed
      ? 'Confirmed lower low — prior structure broken. Needs base rebuild before re-entry.'
      : 'Confirmed support lost — wait for reclaim and base rebuild.';
  if (as.status === 'testing_support') {
    const lvl = as.zoneDisplay ? ` around ${as.zoneDisplay}` : '';
    const cb  = as.criticalBreak != null ? ` Critical break below ${as.criticalBreak.toFixed(2)}.` : '';
    return `Testing active support${lvl}. Holding here is constructive; break below would reset thesis.${cb}`;
  }
  if (as.status === 'bounced_from_support')
    return `Bounced from active support${as.zoneDisplay ? ` (${as.zoneDisplay})` : ''} — near-term constructive. Watch for follow-through.`;
  if (as.status === 'broken_unconfirmed')
    return `Support break is unconfirmed — needs close below${as.criticalBreak != null ? ` ${as.criticalBreak.toFixed(2)}` : ' key level'} to confirm break.`;
  if (as.priorPivotStatus === 'lost_now_overhead' && as.status === 'above_support')
    return `Prior pivot lost and now acts as overhead resistance${as.reclaim != null ? ` — reclaim ${as.reclaim.toFixed(2)} to restore structure` : ''}. Active support intact.`;
  if (es === 'LOWER_HIGH_WARNING')
    return 'Lower-high forming — momentum is slowing. Needs to clear prior high to remain constructive.';
  if (opts.entryConflict && opts.sigLabel)
    return `Options signal (${opts.sigLabel}) is asymmetric, but entry structure is extended or conflicted — wait for reset.`;
  if (cat?.bearish && cat?.event)
    return 'Bullish catalyst is offset by a bearish conflict — net signal is mixed.';
  if (inv !== null && inv >= 75 && action !== 'READY')
    return 'Strong investment quality, but entry is not ready yet. Patience warranted.';
  if (cat?.event && action !== 'READY')
    return 'Catalyst is active, but waiting for entry confirmation before committing.';
  if (policy.available && !cat?.event)
    return 'Theme-wide policy tailwind is active; no company-specific catalyst detected.';
  if (action === 'WAIT_FOR_BREAKOUT')
    return `${label} — coiling or consolidating. Watching for breakout trigger with volume confirmation.`;
  if (action === 'EARLY_WATCH')
    return `Early stage (${label}) — building watch. Entry criteria not yet met.`;
  if (tradeScore >= 75)
    return `Trade signal is strong (${tradeScore}). Continue monitoring for entry confirmation.`;
  return `${label || 'Current'} stage — watching for additional signal confirmation before entry.`;
}

/* ─── Formatters ─────────────────────────────────────────────────── */

function fmtTicker(row: any): string  { return (row.ticker || row.symbol || '').toString().toUpperCase(); }
function fmtCompany(row: any): string { return (row.company || row.name || '').toString(); }
function scoreColor(v: number): string { return v >= 75 ? CC.green : v >= 55 ? CC.teal : v >= 40 ? CC.amber : CC.red; }

function fmtCatalystEvent(ev: any): string {
  if (!ev) return '';
  if (typeof ev === 'string') return ev;
  if (typeof ev === 'object' && ev.title) return String(ev.title);
  if (typeof ev === 'object' && ev.description) return String(ev.description);
  return String(ev);
}

function fmtSource(src: string | null | undefined): string {
  if (!src || src === 'none') return 'None';
  const map: Record<string, string> = {
    rss_v2: 'RSS', scheduled: 'Scheduled', calendar: 'Scheduled', combined: 'Combined',
    theme_policy: 'Theme Policy', rss_v2_plus_theme_policy: 'RSS + Theme Policy',
    scheduled_plus_theme_policy: 'Scheduled + Theme Policy',
  };
  return map[src] ?? src;
}

/* ─── Visual atoms ───────────────────────────────────────────────── */

function ActionabilityBadge({ action }: { action: ActionabilityState }) {
  type Cfg = { label: string; clr: string; bg: string };
  const cfg: Record<ActionabilityState, Cfg> = {
    READY:             { label: 'READY',           clr: CC.green,  bg: `${CC.green}22`          },
    WATCH:             { label: 'WATCH',           clr: CC.teal,   bg: `${CC.teal}1a`            },
    WAIT_FOR_BREAKOUT: { label: 'WAIT · BREAKOUT', clr: CC.amber,  bg: `${CC.amber}1a`           },
    WAIT_FOR_RETEST:   { label: 'WAIT · RETEST',   clr: CC.amber,  bg: `${CC.amber}1a`           },
    EARLY_WATCH:       { label: 'EARLY WATCH',     clr: CC.blue,   bg: `${CC.blue}1a`            },
    SUPPORT_LOST:      { label: 'SUPPORT LOST',    clr: CC.red,    bg: `${CC.red}1a`             },
    TOO_EXTENDED:      { label: 'TOO EXTENDED',    clr: CC.orange, bg: 'rgba(251,146,60,0.16)'   },
    UNKNOWN:           { label: 'UNKNOWN',         clr: CC.dim,    bg: 'transparent'             },
  };
  const c = cfg[action] ?? cfg.UNKNOWN;
  return (
    <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 3, background: c.bg, color: c.clr, fontFamily: CC.font, whiteSpace: 'nowrap' as const }}>
      {c.label}
    </span>
  );
}

function SupportStatusPill({ status, label }: { status: string | null; label: string }) {
  if (!label) return null;
  const clr =
    status === 'lost_confirmed'       ? CC.red   :
    status === 'broken_unconfirmed'   ? CC.orange :
    status === 'testing_support'      ? CC.amber  :
    status === 'bounced_from_support' ? CC.teal   :
    status === 'above_support'        ? CC.green  : CC.dim;
  return (
    <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 3, background: `${clr}18`, color: clr, fontFamily: CC.font, fontWeight: 700, whiteSpace: 'nowrap' as const }}>
      {label}
    </span>
  );
}

function EntryStatePill({ label }: { label: string }) {
  const lc = label.toLowerCase();
  const clr =
    (lc.includes('confirmed') || lc.includes('support lost') || lc.includes('failed'))                    ? CC.red   :
    (lc.includes('warning')   || lc.includes('testing')      || lc.includes('unconfirmed') || lc.includes('lower-high')) ? CC.amber :
    (lc.includes('buy zone')  || lc.includes('breakout'))                                                  ? CC.green :
    (lc.includes('intact')    || lc.includes('bounced'))                                                   ? CC.teal  : CC.dim;
  return <span style={{ fontSize: 8, color: clr, fontFamily: CC.font, fontWeight: 600 }}>{label}</span>;
}

function ScoreChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: 6, color: CC.dim, letterSpacing: '0.07em', textTransform: 'uppercase' as const, fontFamily: CC.font }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: color ?? CC.text, fontFamily: CC.font }}>{value}</span>
    </span>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: 44, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  );
}

/* ─── Support detail block (used in card + breakdown) ───────────── */

function SupportDetailBlock({ as: asSup, dimStyle, boldStyle }: {
  as: ActiveSupportInfo;
  dimStyle: React.CSSProperties;
  boldStyle: React.CSSProperties;
}) {
  if (!asSup.hasActiveSupport && !asSup.zoneDisplay && !asSup.criticalBreak && !asSup.reclaim) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
      {asSup.displayLabel && (
        <SupportStatusPill status={asSup.status} label={asSup.displayLabel} />
      )}
      {asSup.zoneDisplay && (
        <span style={dimStyle}>Active support: <span style={boldStyle}>{asSup.zoneDisplay}</span></span>
      )}
      {asSup.criticalBreak != null && (
        <span style={{ ...dimStyle, color: CC.red }}>Critical break below: {asSup.criticalBreak.toFixed(2)}</span>
      )}
      {asSup.reclaim != null && (
        <span style={{ ...dimStyle, color: CC.amber }}>Reclaim level: {asSup.reclaim.toFixed(2)}</span>
      )}
      {asSup.nextDownside != null && (
        <span style={dimStyle}>Next downside support: <span style={boldStyle}>{asSup.nextDownside.toFixed(2)}</span></span>
      )}
      {asSup.displaySubNote && (
        <span style={{ ...dimStyle, color: CC.amber, fontStyle: 'italic' as const }}>{asSup.displaySubNote}</span>
      )}
    </div>
  );
}

/* ─── Conf Card ──────────────────────────────────────────────────── */

function ConfCard({ row }: { row: any }) {
  const ticker  = fmtTicker(row);
  const company = fmtCompany(row);
  const action  = deriveActionability(row);
  const trade   = getTradeScore(row);
  const entry   = deriveEntryState(row);
  const theme   = row.canonical_theme_name || row.theme || null;
  const { label: stageLabel } = stageMeta(row);
  const inv       = getInvScore(row);
  const invReason = inv === null ? getInvUnavailableReason(row) : null;
  const cat     = getCatalystInfo(row);
  const policy  = getThemePolicyInfo(row);
  const opts    = getOptionsInfo(row);
  const as      = getActiveSupportInfo(row);
  const why     = deriveWhy(row, action, trade);

  const dim  = { fontSize: 8, color: CC.dim, fontFamily: CC.font, lineHeight: 1.4 } as const;
  const bold = { ...dim, color: CC.text, fontWeight: 600 } as const;

  return (
    <div style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: CC.font }}>{ticker}</div>
          {company && <div style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 130 }}>{company}</div>}
        </div>
        <ActionabilityBadge action={action} />
      </div>

      {/* Scores */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
        <ScoreChip label="Trade" value={trade} color={scoreColor(trade)} />
        {inv !== null
          ? <ScoreChip label="Investment" value={inv} color={scoreColor(inv)} />
          : <span style={{ display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: 6, color: CC.dim, textTransform: 'uppercase' as const, fontFamily: CC.font }}>Investment</span>
              <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, maxWidth: 80, textAlign: 'center' as const, lineHeight: 1.2 }}>{invReason}</span>
            </span>
        }
        {opts.alignScore !== null && <ScoreChip label="Options" value={Math.round(opts.alignScore)} color={scoreColor(opts.alignScore)} />}
        {cat?.score != null && <ScoreChip label="Catalyst" value={Math.round(cat.score)} color={scoreColor(cat.score)} />}
      </div>

      {/* Entry + Stage */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <span style={dim}>Entry: <EntryStatePill label={entry} /></span>
        {stageLabel && <span style={dim}>Stage: <span style={{ ...bold, color: CC.teal }}>{stageLabel}</span></span>}
      </div>

      {/* Active support status (when present) */}
      {as.hasActiveSupport && as.displayLabel && (
        <SupportDetailBlock as={as} dimStyle={dim} boldStyle={bold} />
      )}

      {/* Options signal */}
      {opts.sigLabel && (
        <span style={{ ...dim, color: CC.purple }}>
          Options: {opts.sigLabel}{opts.entryConflict ? ' · entry conflict' : ''}
        </span>
      )}

      {/* Catalyst / Policy / Theme / Conflict */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
        {cat?.event
          ? <span style={{ ...dim, color: CC.amber }}>● {cat.eventTitle}</span>
          : <span style={dim}>Catalyst: None</span>
        }
        {policy.available && (
          <span style={{ ...dim, color: CC.purple }}>
            Policy: {policy.theme} +{policy.boost}{policy.event ? ` · ${policy.event}` : ''}
          </span>
        )}
        {theme && <span style={dim}>Theme: <span style={{ color: 'rgba(255,255,255,0.45)' }}>{theme}</span></span>}
        {cat?.bearish && <span style={{ ...dim, color: CC.red }}>⚠ {fmtCatalystEvent(cat.bearish)}</span>}
      </div>

      {/* Why */}
      <div style={{ paddingTop: 6, borderTop: `1px solid ${CC.border}`, ...dim }}>{why}</div>
    </div>
  );
}

/* ─── Layout helpers ─────────────────────────────────────────────── */

function CardGrid({ rows }: { rows: any[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
      {rows.map((r, i) => <ConfCard key={`cc-${fmtTicker(r)}-${i}`} row={r} />)}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div style={{ padding: '20px 0', textAlign: 'center' as const, fontSize: 9, color: CC.dim, fontFamily: CC.font, lineHeight: 1.6 }}>{msg}</div>;
}

/* ─── Tab: Actionable Setups ─────────────────────────────────────── */

function TabActionableSetups({ rows }: { rows: any[] }) {
  const sorted = useMemo(() => {
    return [...rows]
      .map(r => ({ r, action: deriveActionability(r), trade: getTradeScore(r) }))
      .filter(x => x.action !== 'TOO_EXTENDED' && x.action !== 'SUPPORT_LOST')
      .sort((a, b) => {
        const d = actionPriority(a.action) - actionPriority(b.action);
        return d !== 0 ? d : b.trade - a.trade;
      })
      .slice(0, 12).map(x => x.r);
  }, [rows]);
  if (!sorted.length) return <EmptyState msg="No actionable setups in current watchlist." />;
  return <CardGrid rows={sorted} />;
}

/* ─── Tab: Investment Quality ────────────────────────────────────── */

function TabInvestmentQuality({ rows }: { rows: any[] }) {
  const sorted = useMemo(() => {
    return [...rows]
      .sort((a, b) => {
        const ia = getInvScore(a), ib = getInvScore(b);
        if (ia !== null && ib !== null) return ib - ia;
        if (ia !== null) return -1;
        if (ib !== null) return 1;
        return getTradeScore(b) - getTradeScore(a);
      })
      .slice(0, 12);
  }, [rows]);
  const allUnavailable = rows.every(r => getInvScore(r) === null);
  return (
    <>
      {allUnavailable && (
        <div style={{ padding: '0 0 8px', fontSize: 8, color: CC.dim, fontFamily: CC.font }}>
          Investment Alignment score not yet available. Ranked by Trade signal as proxy.
        </div>
      )}
      <CardGrid rows={sorted} />
    </>
  );
}

/* ─── Tab: Theme Policy Tailwinds ────────────────────────────────── */

function TabThemePolicy({ rows }: { rows: any[] }) {
  const policyRows = useMemo(
    () => rows.filter(r => getThemePolicyInfo(r).available),
    [rows],
  );
  if (!policyRows.length) {
    return (
      <EmptyState msg={
        'No Theme Policy tailwinds detected in current watchlist.\n' +
        'Appears when backend returns theme_policy_available=true, theme_policy_boost>0, ' +
        'theme_policy_event, or catalyst.theme_policy_boost>0.'
      } />
    );
  }
  const grouped = new Map<string, any[]>();
  for (const r of policyRows) {
    const key = (getThemePolicyInfo(r).theme ?? 'Unknown') as string;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
      {Array.from(grouped.entries()).map(([theme, trows]) => {
        const pi = getThemePolicyInfo(trows[0]);
        return (
          <div key={theme} style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: CC.purple, fontFamily: CC.font }}>
              {theme}{pi.boost > 0 ? ` +${pi.boost}` : ''}
            </div>
            {pi.event && <div style={{ fontSize: 9, color: CC.text, fontFamily: CC.font, marginTop: 3, lineHeight: 1.4 }}>{pi.event}</div>}
            {pi.score != null && <div style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, marginTop: 2 }}>Policy score: {Math.round(pi.score)}</div>}
            {pi.reasonCodes.length > 0 && <div style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, marginTop: 2 }}>Codes: {pi.reasonCodes.join(' · ')}</div>}
            <div style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, marginTop: 5 }}>
              Affected ({trows.length}): {trows.slice(0, 12).map(fmtTicker).join(', ')}
            </div>
            <div style={{ marginTop: 4, fontSize: 7, color: CC.dim, fontFamily: CC.font, fontStyle: 'italic' }}>
              Theme Policy is sector/macro level — not a company-specific catalyst.
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tab: New Catalysts ─────────────────────────────────────────── */

function TabCatalysts({ rows }: { rows: any[] }) {
  const catRows = useMemo(() => {
    return [...rows]
      .map(r => ({ r, cat: getCatalystInfo(r) }))
      .filter(x => !!x.cat)
      .sort((a, b) => (b.cat?.score ?? 0) - (a.cat?.score ?? 0))
      .slice(0, 20)
      .map(x => x.r);
  }, [rows]);
  if (!catRows.length) {
    return (
      <EmptyState msg={
        'No catalyst events detected in current watchlist.\n' +
        'Appears when backend returns catalyst_primary_event, catalyst_rss_event, catalyst_scheduled_event, ' +
        'catalyst_v2_primary_event, or any of those nested under the catalyst{} object.'
      } />
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      {catRows.map((r, i) => {
        const ticker = fmtTicker(r);
        const cat    = getCatalystInfo(r)!;
        return (
          <div key={`cat-${ticker}-${i}`} style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: CC.font }}>{ticker}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {cat.score != null && <span style={{ fontSize: 9, color: scoreColor(cat.score), fontWeight: 700, fontFamily: CC.font }}>Score {Math.round(cat.score)}</span>}
                {cat.state && <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 2, background: 'rgba(255,255,255,0.06)', color: CC.dim, fontFamily: CC.font }}>{cat.state}</span>}
              </div>
            </div>
            <span style={{ fontSize: 8, color: CC.amber, fontFamily: CC.font, lineHeight: 1.4 }}>● {cat.eventTitle}</span>
            {cat.eventType && <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Type: {cat.eventType}</span>}
            {cat.source && <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Source: {fmtSource(cat.source)}</span>}
            {cat.published && <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Published: {String(cat.published).slice(0, 10)}</span>}
            {cat.pBoost != null && <span style={{ fontSize: 8, color: CC.purple, fontFamily: CC.font }}>Theme Policy: +{cat.pBoost}</span>}
            {cat.bearish && <span style={{ fontSize: 8, color: CC.red, fontFamily: CC.font }}>⚠ Conflict: {fmtCatalystEvent(cat.bearish)}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tab: Risk / Conflicts ──────────────────────────────────────── */

function TabRisk({ rows }: { rows: any[] }) {
  interface RiskEntry { r: any; sev: number; risks: string[]; detail: string }

  const riskEntries = useMemo<RiskEntry[]>(() => {
    const out: RiskEntry[] = [];
    for (const r of rows) {
      const risks: string[] = [];
      const action      = deriveActionability(r);
      const es          = rawEntryState(r);
      const trade       = getTradeScore(r);
      const inv         = getInvScore(r);
      const cat         = getCatalystInfo(r);
      const as          = getActiveSupportInfo(r);
      const sev         = riskSeverity(r);
      const optConflict = r.actionability?.options_entry_conflict === true;
      const opts        = getOptionsInfo(r);

      if (cat?.bearish)                                   risks.push('Bearish catalyst conflict');
      if (as.status === 'lost_confirmed' || as.lowerLowConfirmed) risks.push('Confirmed support lost');
      if (action === 'TOO_EXTENDED')                      risks.push('Vertical / extreme extension');
      if (as.status === 'broken_unconfirmed')             risks.push('Support break unconfirmed');
      if (es === 'LOWER_HIGH_WARNING')                    risks.push('Lower-high warning');
      if (as.status === 'testing_support')                risks.push('Testing active support');
      if (es === 'SUPPORT_TEST' && !as.hasActiveSupport)  risks.push('Testing support');
      if (optConflict && opts.sigLabel)                   risks.push(`Options ${opts.sigLabel} — entry conflict`);
      if (inv !== null && inv < 40 && trade > 65)         risks.push('Hot trade / weak investment quality');
      if (as.priorPivotStatus === 'lost_now_overhead')    risks.push('Prior pivot lost — overhead resistance');

      if (!risks.length) continue;

      const detail =
        as.lowerLowConfirmed || as.status === 'lost_confirmed'
          ? `Confirmed support lost${as.zoneDisplay ? ` (was ${as.zoneDisplay})` : ''}. Wait for base rebuild.${as.reclaim != null ? ` Reclaim level: ${as.reclaim.toFixed(2)}.` : ''}`
        : as.status === 'broken_unconfirmed'
          ? `Support break not yet confirmed. Watch for close below${as.criticalBreak != null ? ` ${as.criticalBreak.toFixed(2)}` : ' key level'}.`
        : as.status === 'testing_support'
          ? `Testing active support${as.zoneDisplay ? ` around ${as.zoneDisplay}` : ''}. Holding is constructive.`
        : action === 'TOO_EXTENDED'
          ? 'Extended beyond normal range — waiting for pullback reduces entry risk.'
        : cat?.bearish
          ? 'Bullish catalyst offset by bearish conflict — net signal mixed.'
        : optConflict
          ? `Options (${opts.sigLabel ?? 'asymmetric'}) signal positive but entry structure conflicts.`
        : inv !== null && inv < 40
          ? `Trade setup (${trade}) stronger than investment quality (${inv}). Speculative.`
        : 'Risk flags present — review structure before entry.';

      out.push({ r, sev, risks, detail });
    }
    return out
      .sort((a, b) => {
        if (b.sev !== a.sev) return b.sev - a.sev;
        const ta = getTradeScore(a.r), tb = getTradeScore(b.r);
        if (tb !== ta) return tb - ta;
        const ca = getCatalystInfo(a.r)?.score ?? 0, cb = getCatalystInfo(b.r)?.score ?? 0;
        return cb - ca;
      })
      .slice(0, 20);
  }, [rows]);

  if (!riskEntries.length) return <EmptyState msg="No significant risk flags detected in current watchlist." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      {riskEntries.map(({ r, sev, risks, detail }, i) => {
        const ticker = fmtTicker(r);
        const trade  = getTradeScore(r);
        return (
          <div key={`risk-${ticker}-${i}`} style={{ background: CC.card, border: `1px solid ${CC.red}35`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: CC.font }}>{ticker}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Trade {trade}</span>
                <span style={{ fontSize: 7, color: CC.red, fontFamily: CC.font, opacity: 0.7 }}>sev {sev}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
              {risks.map((risk, ri) => (
                <span key={ri} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: `${CC.red}1a`, color: CC.red, fontFamily: CC.font, fontWeight: 700 }}>{risk}</span>
              ))}
            </div>
            <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, lineHeight: 1.4 }}>{detail}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Expandable Row Breakdown ───────────────────────────────────── */

export function CaelynRowBreakdown({ stock }: { stock: any }) {
  const action  = deriveActionability(stock);
  const trade   = getTradeScore(stock);
  const entry   = deriveEntryState(stock);
  const why     = deriveWhy(stock, action, trade);
  const { label: stageLabel, score: stageScore, tm } = stageMeta(stock);
  const inv       = getInvScore(stock);
  const invReason = inv === null ? getInvUnavailableReason(stock) : null;
  const cat     = getCatalystInfo(stock);
  const policy  = getThemePolicyInfo(stock);
  const opts    = getOptionsInfo(stock);
  const as      = getActiveSupportInfo(stock);
  const volx    = stock.relative_volume != null ? Number(stock.relative_volume) : null;
  const volMc   = stock.vol_mc_pct      != null ? Number(stock.vol_mc_pct)      : null;
  const timing  = typeof tm.technical_timing_score === 'number' ? tm.technical_timing_score : null;
  const eliteRebound = !!(stock.elite_asset_rebound);

  /* Backend-direct entry fields */
  const entryScore    = stock.entry_score    ?? stock.actionability?.entry_score    ?? null;
  const entryGrade    = stock.entry_grade    ?? stock.actionability?.entry_grade    ?? null;
  const baseArchetype = stock.base_archetype ?? stock.actionability?.base_archetype ?? null;
  const extensionState= stock.extension_state ?? stock.actionability?.extension_state ?? tm.extension_risk ?? null;

  const lbl:  React.CSSProperties = { fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: CC.dim, fontFamily: CC.font, marginBottom: 3 };
  const rSt:  React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 };
  const val:  React.CSSProperties = { fontSize: 9, color: CC.dim, fontFamily: CC.font };
  const bold: React.CSSProperties = { ...val, color: CC.text, fontWeight: 600 };
  const sec:  React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: 4 };

  return (
    <div style={{
      background: '#0d0d12',
      borderBottom: `1px solid ${CC.border}`,
      borderLeft: `2px solid ${CC.teal}55`,
      padding: '12px 18px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
      gap: '14px 22px',
    }}>

      {/* A — Decision */}
      <div style={sec}>
        <div style={lbl}>A — Decision</div>
        <ActionabilityBadge action={action} />
        {opts.setupSummary && (
          <span style={{ ...val, color: CC.text, fontStyle: 'italic', marginTop: 2, lineHeight: 1.4 }}>{opts.setupSummary}</span>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' as const }}>
          <span style={val}>Trade <span style={{ color: scoreColor(trade), fontWeight: 700 }}>{trade}</span></span>
          {inv !== null
            ? <span style={val}>Investment <span style={{ color: scoreColor(inv), fontWeight: 700 }}>{inv}</span></span>
            : <span style={val}>Investment <span style={{ color: CC.dim }}>{invReason}</span></span>
          }
        </div>
        <span style={val}>Entry: <EntryStatePill label={entry} /></span>
      </div>

      {/* B — Trade Components */}
      <div style={sec}>
        <div style={lbl}>B — Trade Components</div>
        {[
          { label: 'Stage',   value: stageScore,                      bar: stageScore,                   clr: CC.teal,   fmt: String(stageScore) },
          volx   != null ? { label: 'VolX',  value: volx,             bar: Math.min(100, volx * 20),     clr: CC.amber,  fmt: `${volx.toFixed(1)}×` }     : null,
          volMc  != null ? { label: 'Vol/MC',value: volMc,            bar: Math.min(100, volMc * 7),     clr: CC.blue,   fmt: `${volMc.toFixed(1)}%` }     : null,
          opts.alignScore != null ? { label: 'Options', value: opts.alignScore, bar: opts.alignScore, clr: CC.purple, fmt: String(Math.round(opts.alignScore)) } : null,
          timing != null ? { label: 'Timing', value: timing,          bar: timing,                       clr: CC.green,  fmt: String(timing) }             : null,
        ].filter(Boolean).map((item: any) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, ...rSt }}>
            <span style={val}>{item.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MiniBar value={item.bar} color={item.clr} />
              <span style={{ ...val, color: item.label === 'Options' ? scoreColor(item.value) : CC.text, fontWeight: 700, width: 32, textAlign: 'right' as const }}>{item.fmt}</span>
            </div>
          </div>
        ))}
      </div>

      {/* C — Investment Case */}
      <div style={sec}>
        <div style={lbl}>C — Investment Case</div>
        {inv !== null
          ? <span style={{ ...val, color: scoreColor(inv), fontSize: 13, fontWeight: 700 }}>{inv} / 100</span>
          : <span style={{ ...val, color: CC.dim }}>Unavailable — {invReason}</span>
        }
        {eliteRebound && (
          <span style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: `${CC.green}1a`, color: CC.green, fontFamily: CC.font, fontWeight: 700, alignSelf: 'flex-start' as const }}>ELITE REBOUND</span>
        )}
        {stageLabel && <span style={val}>Stage: <span style={{ color: CC.teal }}>{stageLabel}</span></span>}
      </div>

      {/* D — Options */}
      <div style={sec}>
        <div style={lbl}>D — Options</div>
        {opts.sigLabel
          ? <>
              <span style={{ ...val, color: CC.purple, fontWeight: 700 }}>Signal: {opts.sigLabel}</span>
              {opts.alignScore !== null && <span style={val}>Score: <span style={{ color: scoreColor(opts.alignScore) }}>{Math.round(opts.alignScore)}</span></span>}
              {opts.entryConflict && (
                <span style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: `${CC.orange}1a`, color: CC.orange, fontFamily: CC.font, fontWeight: 700, alignSelf: 'flex-start' as const }}>
                  ENTRY CONFLICT
                </span>
              )}
            </>
          : <span style={val}>Options: None</span>
        }
        <span style={{ ...val, fontSize: 7, marginTop: 2, color: CC.dim }}>Options signal ≠ entry quality — see Decision for entry verdict</span>
      </div>

      {/* E — Entry & Support Structure */}
      <div style={sec}>
        <div style={lbl}>E — Entry &amp; Support</div>
        <span style={val}>State: <EntryStatePill label={entry} /></span>
        {entryScore  != null && <span style={val}>Score: <span style={{ color: scoreColor(Number(entryScore)) }}>{entryScore}</span></span>}
        {entryGrade  != null && <span style={val}>Grade: <span style={bold}>{entryGrade}</span></span>}
        {baseArchetype && <span style={val}>Base: <span style={bold}>{baseArchetype}</span></span>}
        {extensionState && (
          <span style={val}>Extension: <span style={{ color: String(extensionState).toLowerCase().includes('extreme') || String(extensionState).toLowerCase().includes('vertical') ? CC.red : String(extensionState).toLowerCase().includes('extend') ? CC.amber : CC.text }}>{extensionState}</span></span>
        )}
        {timing   != null && <span style={val}>Timing: <span style={{ color: scoreColor(timing) }}>{timing}</span></span>}
        {tm.entry_zone    && <span style={val}>Zone: <span style={bold}>{tm.entry_zone}</span></span>}
        {tm.breakout_signal && <span style={val}>Breakout: <span style={bold}>{tm.breakout_signal}</span></span>}
      </div>

      {/* F — Active Support Zones */}
      <div style={sec}>
        <div style={lbl}>F — Active Support</div>
        {as.hasActiveSupport
          ? <>
              {as.displayLabel && <SupportStatusPill status={as.status} label={as.displayLabel} />}
              {as.zoneDisplay   && <span style={val}>Active support: <span style={bold}>{as.zoneDisplay}</span></span>}
              {as.criticalBreak != null && <span style={{ ...val, color: CC.red }}>Critical break: {as.criticalBreak.toFixed(2)}</span>}
              {as.reclaim       != null && <span style={{ ...val, color: CC.amber }}>Reclaim level: {as.reclaim.toFixed(2)}</span>}
              {as.nextDownside  != null && <span style={val}>Next downside: <span style={bold}>{as.nextDownside.toFixed(2)}</span></span>}
              {as.priorPivotStatus === 'lost_now_overhead' && (
                <span style={{ ...val, color: CC.amber }}>Prior pivot lost — overhead resistance</span>
              )}
              {as.displaySubNote && <span style={{ ...val, color: CC.amber, fontStyle: 'italic' }}>{as.displaySubNote}</span>}
              {as.structureState && <span style={val}>Structure: <span style={bold}>{as.structureState}</span></span>}
            </>
          : <span style={val}>Active support data not available</span>
        }
      </div>

      {/* G — Catalyst & Policy */}
      <div style={sec}>
        <div style={lbl}>G — Catalyst &amp; Policy</div>
        {cat?.event
          ? <>
              <span style={{ fontSize: 9, color: CC.amber, fontFamily: CC.font, lineHeight: 1.4 }}>{cat.eventTitle}</span>
              {cat.source  && <span style={val}>Source: {fmtSource(cat.source)}</span>}
              {cat.score != null && <span style={val}>Score: <span style={{ color: scoreColor(cat.score) }}>{Math.round(cat.score)}</span></span>}
              {cat.published && <span style={val}>Published: {String(cat.published).slice(0, 10)}</span>}
            </>
          : <span style={val}>Catalyst: None</span>
        }
        {policy.available
          ? <span style={{ ...val, color: CC.purple }}>Policy: {policy.theme} +{policy.boost}{policy.event ? ` · ${policy.event}` : ''}</span>
          : <span style={val}>Policy: None</span>
        }
        {cat?.bearish
          ? <span style={{ ...val, color: CC.red }}>⚠ Conflict: {fmtCatalystEvent(cat.bearish)}</span>
          : <span style={val}>Conflict: None</span>
        }
        <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font, marginTop: 2 }}>Trade ≠ Investment · Options ≠ Entry · Policy ≠ Company catalyst</span>
      </div>

      {/* H — Why / Why Not Now */}
      <div style={{ ...sec, gridColumn: 'span 2' }}>
        <div style={lbl}>H — Why / Why Not Now</div>
        <span style={{ fontSize: 9, color: CC.text, fontFamily: CC.font, lineHeight: 1.55 }}>{why}</span>
      </div>
    </div>
  );
}

/* ─── Main Section ───────────────────────────────────────────────── */

const CONF_TABS = [
  { key: 'setups',   label: 'Actionable Setups'     },
  { key: 'quality',  label: 'Investment Quality'     },
  { key: 'policy',   label: 'Theme Policy Tailwinds' },
  { key: 'catalyst', label: 'New Catalysts'          },
  { key: 'risk',     label: 'Risk / Conflicts'       },
] as const;
type ConfTab = (typeof CONF_TABS)[number]['key'];

export function CaelynConfluenceSection({ rows }: { rows: any[] }) {
  const [tab, setTab]   = useState<ConfTab>('setups');
  const [open, setOpen] = useState(true);
  if (!rows.length) return null;
  return (
    <div style={{ margin: '0 20px 6px', background: CC.surface, border: `1px solid ${CC.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div
        style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: open ? `1px solid ${CC.border}` : 'none' }}
        onClick={() => setOpen(v => !v)}
      >
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: CC.teal, fontFamily: CC.font }}>CAELYN CONFLUENCE</div>
          <div style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font, marginTop: 1 }}>Actionability · Investment quality · Catalysts · Policy tailwinds · Risk</div>
        </div>
        <span style={{ color: CC.dim, fontSize: 10, fontFamily: CC.font }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <>
          <div style={{ display: 'flex', borderBottom: `1px solid ${CC.border}`, overflowX: 'auto' as const }}>
            {CONF_TABS.map(t => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.05em',
                    padding: '7px 13px', cursor: 'pointer',
                    background: 'transparent', border: 'none',
                    borderBottom: active ? `2px solid ${CC.teal}` : '2px solid transparent',
                    color: active ? CC.teal : CC.dim,
                    fontFamily: CC.font, whiteSpace: 'nowrap' as const, transition: 'all 0.12s',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div style={{ padding: '12px 14px', maxHeight: 430, overflowY: 'auto' as const }}>
            {tab === 'setups'   && <TabActionableSetups   rows={rows} />}
            {tab === 'quality'  && <TabInvestmentQuality  rows={rows} />}
            {tab === 'policy'   && <TabThemePolicy        rows={rows} />}
            {tab === 'catalyst' && <TabCatalysts          rows={rows} />}
            {tab === 'risk'     && <TabRisk               rows={rows} />}
          </div>
        </>
      )}
    </div>
  );
}
