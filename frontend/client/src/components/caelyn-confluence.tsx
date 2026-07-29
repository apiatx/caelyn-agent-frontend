import React, { useState, useMemo, useEffect, useCallback } from 'react';

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

/** Safely coerce a theme_policy_event or theme_policy_theme value to a display string.
 *  The backend may return a full policy object instead of a plain string. */
function policyStr(val: any): string | null {
  if (val == null) return null;
  if (typeof val === 'string') return val || null;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    /* Policy event objects: prefer policy_title, then article key fields */
    return val.policy_title ?? val.title ?? val.name ?? val.event_type ?? val.policy_event_type ?? null;
  }
  return null;
}

function getThemePolicyInfo(row: any): PolicyInfo {
  const rawEvent  = row.theme_policy_event  ?? row.catalyst?.theme_policy_event  ?? null;
  const rawTheme  = row.theme_policy_theme  ?? row.catalyst?.theme_policy_theme  ?? null;
  const flat   = row.theme_policy_available === true || (row.theme_policy_boost && Number(row.theme_policy_boost) > 0) || !!rawEvent;
  const nested = row.catalyst?.theme_policy_boost && Number(row.catalyst.theme_policy_boost) > 0;
  if (flat || nested) {
    const boost = Number(row.theme_policy_boost ?? row.catalyst?.theme_policy_boost ?? 0);
    return {
      available: true, boost,
      theme: policyStr(rawTheme),
      event: policyStr(rawEvent),
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

function deriveActionability(row: any): ActionabilityState {
  const as   = getActiveSupportInfo(row);
  const es   = rawEntryState(row);

  /* Confirmed loss — must have active_support_status = lost_confirmed OR lower_low_confirmed OR major_support_lost */
  if (as.isConfirmedLoss) return 'SUPPORT_LOST';

  /* Backend entry_risk_reward_state — authoritative when present */
  const errState = (
    row.entry_risk_reward_state ??
    row.actionability?.entry_risk_reward_state ??
    ''
  ).toUpperCase();
  if (errState === 'STRONG_ASSET_EXTENDED_WAIT') return 'TOO_EXTENDED';
  if (errState === 'BROKEN_SUPPORT_AVOID')       return 'SUPPORT_LOST';

  /* Backend flat actionability verdict (when returned as string or nested verdict) */
  const beAct = typeof row.actionability === 'string'
    ? row.actionability.toUpperCase()
    : (row.actionability?.verdict ?? row.actionability?.state ?? '').toUpperCase();
  if (beAct === 'TOO_EXTENDED' || beAct === 'AVOID') return 'TOO_EXTENDED';
  if (beAct === 'BROKEN_SUPPORT_AVOID')              return 'SUPPORT_LOST';

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
  const errState = (r.entry_risk_reward_state ?? r.actionability?.entry_risk_reward_state ?? '').toUpperCase();
  const bucket   = (r.caelyn_confluence_bucket ?? '').toUpperCase();
  const beAct    = typeof r.actionability === 'string' ? r.actionability.toUpperCase() : '';

  /* Spec severity weights (Part 6) */
  if (bucket === 'RISK_CONFLICT')                                                sev += 100;
  if (as.lowerLowConfirmed)                                                      sev +=  95;
  if (errState === 'BROKEN_SUPPORT_AVOID' || as.status === 'lost_confirmed')     sev +=  90;
  if (beAct === 'AVOID' || action === 'SUPPORT_LOST')                            sev +=  90;
  if (cat?.bearish)                                                              sev +=  70;
  if (bucket === 'WATCH_FOR_RESET')                                              sev +=  75;
  if (errState === 'STRONG_ASSET_EXTENDED_WAIT')                                 sev +=  75;
  if (action === 'TOO_EXTENDED')                                                 sev +=  70;
  if (['extreme_extension','vertical','crowded_move'].includes(extRaw))          sev +=  65;
  if (optConflict)                                                               sev +=  55;
  if (as.status === 'broken_unconfirmed')                                        sev +=  50;
  if (es === 'LOWER_HIGH_WARNING')                                               sev +=  40;
  if (as.priorPivotStatus === 'lost_now_overhead' && as.status !== 'lost_confirmed') sev += 35;
  if (es === 'SUPPORT_TEST' || as.status === 'testing_support')                  sev +=  25;

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

/* ─── Bucket badge (caelyn_confluence_bucket) ────────────────────── */

const BUCKET_LABELS: Record<string, { label: string; clr: string; bg: string }> = {
  ACTIONABLE:            { label: 'ACTIONABLE',       clr: '#22c55e', bg: 'rgba(34,197,94,0.18)'   },
  NEAR_ACTIONABLE:       { label: 'NEAR ACTIONABLE',  clr: '#0ea5e9', bg: 'rgba(14,165,233,0.14)'  },
  CONFLUENCE_AT_SUPPORT: { label: 'AT SUPPORT',       clr: '#3b82f6', bg: 'rgba(59,130,246,0.14)'  },
  WATCH_FOR_RESET:       { label: 'WATCH / RESET',    clr: '#f59e0b', bg: 'rgba(245,158,11,0.14)'  },
  RISK_CONFLICT:         { label: 'RISK / CONFLICT',  clr: '#ef4444', bg: 'rgba(239,68,68,0.14)'   },
  NO_CLEAR_CONFLUENCE:   { label: 'NO CONFLUENCE',    clr: '#a9aaa6', bg: 'transparent'            },
};

function BucketBadge({ bucket }: { bucket?: string | null }) {
  if (!bucket) return null;
  const c = BUCKET_LABELS[bucket] ?? { label: bucket, clr: '#a9aaa6', bg: 'transparent' };
  return (
    <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 3, background: c.bg, color: c.clr, fontFamily: "'JetBrains Mono','Fira Code',monospace", whiteSpace: 'nowrap' as const }}>
      {c.label}
    </span>
  );
}

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

function ConfCard({ row, onTickerClick }: { row: any; onTickerClick?: (t: string) => void }) {
  const ticker  = fmtTicker(row);
  const company = fmtCompany(row);
  const action  = deriveActionability(row);
  const trade   = getTradeScore(row);
  const entry   = deriveEntryState(row);
  const theme   = row.canonical_theme_name
    || (typeof row.theme === 'string' ? row.theme : (row.theme?.name ?? row.theme?.label ?? row.theme?.canonical_name ?? null))
    || null;
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
          <div
            onClick={() => onTickerClick?.(ticker)}
            style={{ fontSize: 12, fontWeight: 800, color: onTickerClick ? CC.teal : '#fff', fontFamily: CC.font, cursor: onTickerClick ? 'pointer' : 'default', textDecoration: onTickerClick ? 'underline' : 'none' }}
          >{ticker}</div>
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
        {(() => {
          const rawCatScore = row.catalyst_alignment_score ?? row.catalyst?.alignment_score ?? row.catalyst?.score ?? null;
          const catScore = rawCatScore != null && Number.isFinite(Number(rawCatScore)) ? Number(rawCatScore) : null;
          if (cat?.event) {
            return <span style={{ ...dim, color: CC.amber }}>● {cat.eventTitle}</span>;
          } else if (catScore != null && catScore > 0) {
            return <span style={{ ...dim, color: CC.amber }}>Catalyst: {Math.round(catScore)} — event details unavailable</span>;
          } else {
            return <span style={{ ...dim, color: 'rgba(255,255,255,0.2)' }}>Catalyst: None</span>;
          }
        })()}
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

function CardGrid({ rows, onTickerClick }: { rows: any[]; onTickerClick?: (t: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
      {rows.map((r, i) => <ConfCard key={`cc-${fmtTicker(r)}-${i}`} row={r} onTickerClick={onTickerClick} />)}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div style={{ padding: '20px 0', textAlign: 'center' as const, fontSize: 9, color: CC.dim, fontFamily: CC.font, lineHeight: 1.6 }}>{msg}</div>;
}

/* ─── Tab: All Confluence — V4.2.1 Screener Table ─────────────────── */

/* Decision badge map — uses backend actionability_state directly */
/* ─── V4.2 Contract Helpers ──────────────────────────────────────── */

const ACTION_LABEL_DISPLAY: Record<string, string> = {
  READY:                 'Ready to Enter',
  ACTIONABLE:            'Ready to Enter',
  NEAR_ACTIONABLE:       'Near Entry',
  WAIT_FOR_BREAKOUT:     'Wait for Breakout',
  WAIT_FOR_RETEST:       'Wait for Retest',
  WATCH_FOR_RESET:       'Watch for Reset',
  WATCH:                 'Watch',
  CONFLUENCE_AT_SUPPORT: 'Confluence at Support',
  AVOID:                 'Avoid',
  RISK_CONFLICT:         'Avoid (Conflict)',
  NO_CLEAR_CONFLUENCE:   'No Confluence',
  INSUFFICIENT_DATA:     'Insufficient Data',
};

/** Normalize a confluence_v42 object from either the nested confluence_v42
 *  (from /api/alpha/confluence/{symbol}) or flat caelyn_confluence_v42_* fields
 *  (from /api/watchlist/{id}/alignment). Returns null if no CCS data present. */
function readV42(row: any) {
  if (row?.confluence_v42) {
    const cv42 = row.confluence_v42 as V42Shape;
    /* The alignment endpoint pre-builds confluence_v42 but leaves
       components.valuation = null — valuation data lives only in
       caelyn_confluence_v42_components.valuation. Merge it in. */
    if (!cv42.components?.valuation?.points) {
      const rawVal = row.caelyn_confluence_v42_components?.valuation;
      if (rawVal && rawVal.points != null) {
        return {
          ...cv42,
          components: {
            ...(cv42.components ?? {}),
            valuation: {
              raw_score:    rawVal.raw_score    ?? null,
              points:       rawVal.points,
              max_points:   rawVal.max_points   ?? 8,
              available:    rawVal.available     ?? true,
              status:       rawVal.status        ?? rawVal.valuation_coverage_status ?? 'available',
              reason_codes: rawVal.reason_codes  ?? rawVal.valuation_reason_codes ?? [],
              label:        rawVal.valuation_label ?? rawVal.label ?? undefined,
              quality_label:rawVal.quality_label ?? undefined,
              pillar_count: rawVal.pillar_count  ?? undefined,
            } satisfies V42Component,
          },
        } satisfies V42Shape;
      }
    }
    return cv42;
  }
  const ccs  = row.caelyn_confluence_score;
  const core = row.caelyn_confluence_core_score ?? row.caelyn_confluence_v42_core_score;
  const bonus= row.caelyn_confluence_bonus_score ?? row.caelyn_confluence_v42_bonus_score;
  if (ccs == null && core == null) return null;
  const compsRaw = row.caelyn_confluence_v42_components ?? {};
  const bonusRaw = row.caelyn_confluence_v42_bonus_breakdown ?? {};
  const actRaw   = ((row.actionability_state ?? row.caelyn_confluence_v42_actionability ?? '') as string).toUpperCase();
  function comp(c: any, ptsFallback: number | null, maxPts: number, statusFallback?: string): V42Component {
    return {
      raw_score:    c?.raw_score ?? null,
      points:       c?.points ?? ptsFallback,
      max_points:   c?.max_points ?? maxPts,
      available:    c?.available ?? (ptsFallback != null),
      status:       c?.status ?? statusFallback ?? 'available',
      reason_codes: c?.reason_codes ?? [],
      label:        c?.label,
      quality_label:c?.quality_label,
      pillar_count: c?.pillar_count,
    };
  }
  const socialPts = Number(row.social_bonus_points ?? bonusRaw.social?.points ?? 0);
  const botlPts   = Number(row.bottleneck_bonus_points ?? bonusRaw.bottleneck?.points ?? 0);
  return {
    score: {
      total: Number(ccs ?? 0), core: Number(core ?? 0), bonus: Number(bonus ?? 0),
      core_max: 100, bonus_max: 25, total_max: row.caelyn_confluence_v42_max_score ?? 125,
    },
    action: {
      label: actRaw, bucket: row.caelyn_confluence_bucket ?? actRaw,
      label_display: ACTION_LABEL_DISPLAY[actRaw] ?? actRaw.replace(/_/g, ' '),
      execution_state: (row.entry_execution_state ?? null) as string | undefined,
      execution_label: (row.entry_execution_label ?? null) as string | undefined,
      invalidation_level: null as number | null, target_zone: null,
      why_now: [] as string[], why_wait: [] as string[],
    },
    booleans: {
      is_actionable_setup:   row.is_actionable_setup   ?? false,
      is_near_actionable:    row.is_near_actionable    ?? false,
      is_watch_for_reset:    row.is_watch_for_reset    ?? false,
      is_risk_conflict:      row.is_risk_conflict      ?? false,
      is_investment_quality: row.is_investment_quality ?? false,
    },
    components: {
      theme:          comp(compsRaw.theme_alignment,     row.theme_alignment_points,                          15),
      stage:          comp(compsRaw.stage_quality,       row.stage_quality_points,                            15),
      options:        comp(compsRaw.options_alignment,   row.options_alignment_points,                        18, row.options_status ?? row.options_snapshot_status),
      technical_setup:comp(compsRaw.technical_setup,    row.technical_setup_points,                          8),
      entry_exit:     comp(compsRaw.entry_exit,          row.entry_exit_points ?? row.entry_risk_reward_points, 12),
      catalyst:       comp(compsRaw.catalyst_alignment,  row.catalyst_alignment_points,                       12),
      investment:     comp(compsRaw.investment_alignment,row.investment_alignment_points,                     12),
      valuation:      comp(compsRaw.valuation_alignment ?? compsRaw.valuation, row.valuation_alignment_points ?? row.valuation_points, 8, row.valuation_coverage_status ?? 'coverage_unknown'),
    },
    bonuses: {
      social:        { points: socialPts, max_points: 15, sections_hit: row.social_sections_hit ?? 0, status: row.social_confluence_hit ? 'available' : 'no_social_coverage', confluence_hit: row.social_confluence_hit },
      whale_insider: { points: 0, max_points: 5, status: 'not_wired' },
      bottleneck:    { points: botlPts, max_points: 5, anchor_count: row.bottleneck_anchor_count ?? bonusRaw.bottleneck?.anchor_count ?? 0, status: botlPts > 0 ? 'available' : 'not_in_screener' },
    },
    metadata: {
      confidence_score: Number(row.caelyn_confluence_confidence_score ?? row.caelyn_confluence_v42_confidence_score ?? 0),
      data_status_flags: [] as string[],
    },
    risk:      { risk_flags: [] as string[], caution_flags: (row.caution_flags ?? []) as string[] },
    technical: undefined as V42Technical | undefined,
  } satisfies V42Shape;
}

type V42Component = { raw_score: number | null; points: number | null; max_points: number; available: boolean; status: string; reason_codes: string[]; label?: string; quality_label?: string; pillar_count?: number };
type V42Technical = { stage_label?: string; stage_score?: number; technical_setup_label?: string; entry_state?: string; entry_state_display?: string; entry_score?: number; extension_state?: string; extension_quality?: string; fib_context?: string; nearest_fib_label?: string; nearest_fib_level?: number; distance_to_fib_pct?: number; fib_confidence?: number; fib_wave_status?: string; wave_structure?: string; wave_score?: number };
type V42Shape = {
  score:    { total: number; core: number; bonus: number; core_max: number; bonus_max: number; total_max: number; display_mode?: string; percent_of_total_max?: number };
  action:   { label: string; bucket: string; label_display: string; execution_state?: string; execution_label?: string; invalidation_level: number | null; target_zone: any; why_now: string[]; why_wait: string[] };
  components: Record<string, V42Component>;
  bonuses:  { social: { points: number; max_points: number; sections_hit: number; status: string; confluence_hit?: boolean }; whale_insider: { points: number; max_points: number; status: string }; bottleneck: { points: number; max_points: number; anchor_count: number; status: string } };
  booleans: { is_actionable_setup: boolean; is_near_actionable: boolean; is_watch_for_reset: boolean; is_risk_conflict: boolean; is_investment_quality: boolean };
  metadata: { confidence_score: number; data_status_flags: string[]; reason_codes?: string[] };
  risk:     { risk_flags: string[]; caution_flags?: string[]; major_lower_low_confirmed?: boolean; lower_low_confirmed?: boolean; chase_extension?: boolean; critical_break_level?: number; active_support_status?: string; distance_to_active_support_pct?: number };
  technical?: V42Technical;
};

const DECISION_BADGE: Record<string, { label: string; clr: string; bg: string }> = {
  READY:                 { label: 'READY',         clr: '#22c55e', bg: 'rgba(34,197,94,0.18)'   },
  ACTIONABLE:            { label: 'ACTIONABLE',     clr: '#22c55e', bg: 'rgba(34,197,94,0.18)'   },
  NEAR_ACTIONABLE:       { label: 'NEAR ACT.',      clr: '#0ea5e9', bg: 'rgba(14,165,233,0.14)'  },
  WATCH:                 { label: 'WATCH',          clr: '#3b82f6', bg: 'rgba(59,130,246,0.14)'  },
  CONFLUENCE_AT_SUPPORT: { label: 'AT SUPPORT',     clr: '#3b82f6', bg: 'rgba(59,130,246,0.14)'  },
  WATCH_FOR_RESET:       { label: 'WATCH/RESET',    clr: '#f59e0b', bg: 'rgba(245,158,11,0.14)'  },
  AVOID:                 { label: 'AVOID',          clr: '#ef4444', bg: 'rgba(239,68,68,0.14)'   },
  RISK_CONFLICT:         { label: 'RISK/CONFLICT',  clr: '#ef4444', bg: 'rgba(239,68,68,0.14)'   },
  NO_CLEAR_CONFLUENCE:   { label: 'NO CONFLUENCE',  clr: '#a9aaa6', bg: 'transparent'            },
};

function DecisionBadge({ state, display }: { state?: string | null; display?: string | null }) {
  if (!state) return <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>;
  const key = state.toUpperCase();
  const cfg = DECISION_BADGE[key] ?? { label: ACTION_LABEL_DISPLAY[key] ?? key.replace(/_/g, ' '), clr: CC.dim, bg: 'transparent' };
  const text = display ?? cfg.label;
  return (
    <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 4px', borderRadius: 3, background: cfg.bg, color: cfg.clr, fontFamily: CC.font, whiteSpace: 'nowrap' as const }}>
      {text}
    </span>
  );
}

/** Read a V4.2.1 component points value — checks top-level field first, then nested components object */
function getV42Pts(row: any, topKey: string, compKey: string): number | null {
  if (row[topKey] != null && Number.isFinite(Number(row[topKey]))) return Number(row[topKey]);
  const comps = row.caelyn_confluence_v42_components;
  if (comps && comps[compKey] != null && Number.isFinite(Number(comps[compKey].points))) return Number(comps[compKey].points);
  return null;
}

function ccsColor(v: number): string {
  return v >= 90 ? CC.green : v >= 65 ? CC.teal : v >= 45 ? CC.amber : CC.red;
}

function ptsColor(pts: number, max: number): string {
  const pct = pts / max;
  return pct >= 0.75 ? CC.green : pct >= 0.5 ? CC.teal : pct >= 0.25 ? CC.amber : CC.dim;
}

function OptionsStatusCell({ row }: { row: any }) {
  const status  = ((row.options_status ?? row.options_snapshot_status ?? '') as string).toLowerCase();
  const pts     = row.options_alignment_points != null ? Number(row.options_alignment_points) : null;
  const ptsClr  = pts != null ? ptsColor(pts, 18) : CC.dim;
  const queueSt = row.options_scanner_queue_status ?? null;
  const priority= row.options_backfill_priority ?? null;
  const isHighPri = priority === 'high' || queueSt === 'queued_high_priority';

  if (status === 'not_scanned') {
    return <span style={{ fontSize: 7, fontWeight: 600, color: isHighPri ? CC.amber : CC.dim, fontFamily: CC.font }}>{isHighPri ? '⏳ Queued' : 'Not scanned'}</span>;
  }
  if (status === 'confirmed_no_options') {
    return <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>No options</span>;
  }
  if (status.includes('foreign') || status.includes('otc')) {
    return <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>Excluded</span>;
  }
  if (pts != null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 1 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: ptsClr, fontFamily: CC.font }}>{pts.toFixed(1)} / 18</span>
        {status && status !== 'available_cached' && <span style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font }}>{status.replace(/_/g, ' ')}</span>}
      </div>
    );
  }
  return <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>{status || '—'}</span>;
}

function BonusCell({ row }: { row: any }) {
  const v42b   = readV42(row)?.bonuses;
  const social = v42b?.social.points ?? null;
  const botl   = v42b?.bottleneck.points ?? null;
  const total  = (social ?? 0) + (botl ?? 0);

  if (social == null && botl == null) {
    return <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 1 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: total > 2 ? CC.purple : total > 0 ? 'rgba(168,85,247,0.6)' : CC.dim, fontFamily: CC.font }}>+{total.toFixed(1)}</span>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' as const }}>
        {social != null && social > 0 && <span style={{ fontSize: 6, padding: '1px 3px', borderRadius: 2, background: 'rgba(168,85,247,0.15)', color: CC.purple, fontFamily: CC.font }}>S{social.toFixed(0)}/15</span>}
        <span style={{ fontSize: 6, color: 'rgba(169,170,166,0.25)', fontFamily: CC.font }} title="Whale/Insider not wired yet">W—</span>
        {botl != null && botl > 0 && <span style={{ fontSize: 6, padding: '1px 3px', borderRadius: 2, background: 'rgba(251,146,60,0.15)', color: CC.orange, fontFamily: CC.font }}>B{botl.toFixed(1)}/5</span>}
      </div>
    </div>
  );
}

/* V4.2.1 sort key type */
type SortKey = 'ticker' | 'confluence' | 'decision' | 'setup' | 'theme' | 'options' | 'entry_exit' | 'catalyst' | 'investment' | 'valuation' | 'bonuses' | 'confidence';

const COL_DEFS: { key: SortKey; label: string; width: string; title?: string }[] = [
  { key: 'ticker',     label: 'Ticker',    width: '1.6fr',  title: 'Ticker symbol and company name' },
  { key: 'confluence', label: 'CCS',       width: '1fr',    title: 'Caelyn Confluence Score — Core/100 + Bonus' },
  { key: 'decision',   label: 'Decision',  width: '1.5fr',  title: 'Backend actionability state — not derived in frontend' },
  { key: 'setup',      label: 'Setup',     width: '0.85fr', title: 'Technical setup points / 8' },
  { key: 'theme',      label: 'Theme',     width: '0.85fr', title: 'Theme alignment points / 15' },
  { key: 'options',    label: 'Options',   width: '1fr',    title: 'Options alignment points / 18' },
  { key: 'entry_exit', label: 'Entry',     width: '0.85fr', title: 'Entry/Exit points / 12' },
  { key: 'catalyst',   label: 'Catalyst',  width: '0.85fr', title: 'Catalyst alignment points / 12' },
  { key: 'investment', label: 'Invest.',   width: '0.85fr', title: 'Investment alignment points / 12' },
  { key: 'valuation',  label: 'Valuation', width: '0.85fr', title: 'Valuation alignment points / 8' },
  { key: 'bonuses',    label: 'Bonus',     width: '0.75fr', title: 'Social + Whale/Insider + Bottleneck bonus points / 25' },
  { key: 'confidence', label: 'Conf.',     width: '0.7fr',  title: 'Data completeness / trustworthiness — not bullishness' },
];

const GRID_COLS = `18px ${COL_DEFS.map(c => c.width).join(' ')}`;

/* ─── Adjusted CCS constants ─────────────────────────────────────── */
const LS_KEY_DISABLED = 'caelyn_confluence_disabled_components_v1';
const TOGGLEABLE_COLS: ReadonlySet<SortKey> = new Set<SortKey>(['setup', 'theme', 'options', 'entry_exit', 'catalyst', 'investment', 'valuation']);
const COMP_MAX: Record<string, number> = {
  stage: 15, theme: 15, setup: 8, options: 18,
  entry_exit: 12, catalyst: 12, investment: 12, valuation: 8,
};
const LS_KEY_HIDE = 'caelyn_confluence_hide_excluded_columns_v1';
const LENS_CHIPS: { key: SortKey; label: string; max: number }[] = [
  { key: 'theme',      label: 'Theme',     max: 15 },
  { key: 'setup',      label: 'Setup',     max: 8  },
  { key: 'options',    label: 'Options',   max: 18 },
  { key: 'entry_exit', label: 'Entry',     max: 12 },
  { key: 'catalyst',   label: 'Catalyst',  max: 12 },
  { key: 'investment', label: 'Invest.',   max: 12 },
  { key: 'valuation',  label: 'Valuation', max: 8  },
];

/* ─── V4.2.1 Screener Table (shared across all tabs) ─────────────── */

function V42ScreenerTable({
  rows,
  onTickerClick,
  emptyMsg = 'No rows match this filter.',
}: {
  rows: any[];
  onTickerClick?: (t: string) => void;
  emptyMsg?: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('confluence');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [disabledCols, setDisabledCols] = useState<Set<SortKey>>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_DISABLED);
      if (stored) return new Set(JSON.parse(stored) as SortKey[]);
    } catch {}
    return new Set<SortKey>();
  });
  const [hideExcluded, setHideExcluded] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_KEY_HIDE) === 'true'; } catch {} return false;
  });

  const isAdjusted = disabledCols.size > 0;

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleCol = (key: SortKey) => {
    if (!TOGGLEABLE_COLS.has(key)) return;
    setDisabledCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem(LS_KEY_DISABLED, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const resetWeights = () => {
    setDisabledCols(new Set());
    setHideExcluded(false);
    try { localStorage.removeItem(LS_KEY_DISABLED); localStorage.removeItem(LS_KEY_HIDE); } catch {}
  };

  const computeAdjustedCCS = useCallback((r: any): number | null => {
    const v42c = readV42(r);
    const comps = v42c?.components ?? {};
    const stagePts = Number(comps.stage?.points ?? getV42Pts(r, 'stage_quality_points', 'stage_quality') ?? 0);
    const componentPts: Record<string, number> = {
      theme:      Number(comps.theme?.points ?? getV42Pts(r, 'theme_alignment_points', 'theme_alignment') ?? 0),
      setup:      Number(comps.technical_setup?.points ?? getV42Pts(r, 'technical_setup_points', 'technical_setup') ?? 0),
      options:    Number(comps.options_alignment?.points ?? getV42Pts(r, 'options_alignment_points', 'options_alignment') ?? 0),
      entry_exit: Number(comps.entry_exit?.points ?? getV42Pts(r, 'entry_exit_points', 'entry_exit') ?? getV42Pts(r, 'entry_risk_reward_points', 'entry') ?? 0),
      catalyst:   Number(comps.catalyst?.points ?? getV42Pts(r, 'catalyst_alignment_points', 'catalyst_alignment') ?? 0),
      investment: Number(comps.investment?.points ?? getV42Pts(r, 'investment_alignment_points', 'investment_alignment') ?? 0),
      valuation:  comps.valuation?.points != null ? Number(comps.valuation.points) : (r.valuation_alignment_points != null ? Number(r.valuation_alignment_points) : 0),
    };
    let activePts = stagePts;
    let activeMax = COMP_MAX.stage;
    for (const key of Object.keys(componentPts)) {
      if (!disabledCols.has(key as SortKey)) {
        activePts += componentPts[key];
        activeMax += COMP_MAX[key] ?? 0;
      }
    }
    if (activeMax <= 0) return null;
    const result = (activePts / activeMax) * 100;
    return Number.isFinite(result) ? result : null;
  }, [disabledCols]);

  const activeMax = useMemo(() => {
    let m = COMP_MAX.stage;
    for (const key of Object.keys(COMP_MAX)) {
      if (key !== 'stage' && !disabledCols.has(key as SortKey)) m += COMP_MAX[key];
    }
    return m;
  }, [disabledCols]);

  const visibleCols = useMemo(() =>
    COL_DEFS.filter(col => !hideExcluded || !TOGGLEABLE_COLS.has(col.key) || !disabledCols.has(col.key)),
    [hideExcluded, disabledCols]
  );
  const gridCols = `18px ${visibleCols.map(c => c.width).join(' ')}`;

  const sorted = useMemo(() => {
    const dir = sortDir === 'desc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const ta = fmtTicker(a), tb = fmtTicker(b);
      const getVal = (r: any): number | string => {
        switch (sortKey) {
          case 'ticker':     return fmtTicker(r);
          case 'confluence':
            if (isAdjusted) { const adj = computeAdjustedCCS(r); return adj ?? Number(r.caelyn_confluence_score ?? 0); }
            return Number(r.caelyn_confluence_score ?? 0);
          case 'decision': {
            const order: Record<string, number> = { READY: 0, ACTIONABLE: 0, NEAR_ACTIONABLE: 1, WATCH: 2, CONFLUENCE_AT_SUPPORT: 2, WATCH_FOR_RESET: 3, AVOID: 4, RISK_CONFLICT: 5, NO_CLEAR_CONFLUENCE: 6 };
            return order[(r.actionability_state ?? '').toUpperCase()] ?? 3;
          }
          case 'setup':      return getV42Pts(r, 'technical_setup_points', 'technical_setup') ?? getV42Pts(r, 'stage_quality_points', 'stage_quality') ?? -1;
          case 'theme':      return getV42Pts(r, 'theme_alignment_points', 'theme_alignment') ?? -1;
          case 'options':    return getV42Pts(r, 'options_alignment_points', 'options_alignment') ?? -1;
          case 'entry_exit': return getV42Pts(r, 'entry_exit_points', 'entry_exit') ?? getV42Pts(r, 'entry_risk_reward_points', 'entry') ?? -1;
          case 'catalyst':   return getV42Pts(r, 'catalyst_alignment_points', 'catalyst_alignment') ?? -1;
          case 'investment': return getV42Pts(r, 'investment_alignment_points', 'investment_alignment') ?? -1;
          case 'valuation':  return readV42(r)?.components?.valuation?.points ?? -1;
          case 'bonuses': {
            const s  = r.social_bonus_points != null ? Number(r.social_bonus_points) : 0;
            const wSt= r.whale_insider_status ?? r.caelyn_confluence_v42_bonus_breakdown?.whale_insider?.status ?? null;
            const wPts = wSt !== 'not_wired' && r.whale_insider_bonus_points != null ? Number(r.whale_insider_bonus_points) : 0;
            const bt = r.bottleneck_bonus_points != null ? Number(r.bottleneck_bonus_points) : 0;
            return s + wPts + bt;
          }
          case 'confidence': return Number(r.caelyn_confluence_confidence_score ?? r.caelyn_confluence_v42_confidence_score ?? 0);
        }
      };
      const va = getVal(a), vb = getVal(b);
      if (typeof va === 'number' && typeof vb === 'number') return (vb - va) * dir || (ta < tb ? -1 : ta > tb ? 1 : 0);
      return (String(va) < String(vb) ? -1 : String(va) > String(vb) ? 1 : 0) * dir;
    });
  }, [rows, sortKey, sortDir, isAdjusted, computeAdjustedCCS]);

  if (!sorted.length) return <EmptyState msg={emptyMsg} />;

  const hasCcs = sorted.some(r => r.caelyn_confluence_score != null);
  if (!hasCcs) {
    const sampleKeys = sorted.length > 0 ? Object.keys(sorted[0]).sort().join(', ') : '—';
    return (
      <div style={{ padding: '16px 0', fontFamily: CC.font }}>
        <div style={{ fontSize: 9, color: CC.dim, lineHeight: 1.8 }}>
          caelyn_confluence_score not present in rows yet.<br />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>Rows: {sorted.length} · Sample keys: {sampleKeys.slice(0, 200)}</span>
        </div>
      </div>
    );
  }

  const hdr: React.CSSProperties = {
    fontSize: 7, fontFamily: CC.font, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
    display: 'flex', alignItems: 'center', gap: 2,
  };

  const sortArrow = (key: SortKey) => {
    if (key !== sortKey) return <span style={{ opacity: 0.25, fontSize: 6 }}>↕</span>;
    return <span style={{ color: CC.teal, fontSize: 6 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  const disabledColNames = [...disabledCols].map(k => LENS_CHIPS.find(c => c.key === k)?.label ?? k);

  return (
    <div style={{ width: '100%' }}>

      {/* ── Score Lens Control Bar ─────────────────────────────────────── */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap' as const, gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: CC.text, fontFamily: CC.font, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Score Lens</span>
            <span style={{ fontSize: 6.5, color: CC.dim, fontFamily: CC.font }}>Exclude components to see how CCS changes without them.</span>
          </div>
          <button
            onClick={resetWeights}
            style={{ fontSize: 7, padding: '2px 8px', borderRadius: 3, border: `1px solid ${CC.border}`, background: 'transparent', color: CC.dim, cursor: 'pointer', fontFamily: CC.font, whiteSpace: 'nowrap' as const }}
          >
            Reset Score Lens
          </button>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          {LENS_CHIPS.map(({ key, label, max }) => {
            const excluded = disabledCols.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleCol(key)}
                title={excluded ? 'Click to include in adjusted CCS' : 'Click to exclude from adjusted CCS'}
                style={{
                  fontSize: 7, padding: '3px 9px', borderRadius: 10, cursor: 'pointer', fontFamily: CC.font,
                  border: excluded ? `1px solid rgba(100,116,139,0.35)` : `1px solid ${CC.teal}`,
                  background: excluded ? 'rgba(100,116,139,0.07)' : 'rgba(14,165,233,0.08)',
                  color: excluded ? 'rgba(100,116,139,0.55)' : CC.teal,
                  fontWeight: excluded ? 400 : 600,
                  transition: 'all 0.12s',
                  lineHeight: 1.5,
                }}
              >
                {excluded ? '⊘' : '✓'} {label} /{max}
              </button>
            );
          })}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 7, color: CC.dim, fontFamily: CC.font, cursor: 'pointer', marginLeft: 6 }}>
            <input
              type="checkbox"
              checked={hideExcluded}
              onChange={e => {
                const v = e.target.checked;
                setHideExcluded(v);
                try { localStorage.setItem(LS_KEY_HIDE, String(v)); } catch {}
              }}
              style={{ cursor: 'pointer', width: 10, height: 10, accentColor: CC.teal }}
            />
            Hide excluded columns
          </label>
        </div>
      </div>

      {/* ── Adjusted mode banner ─────────────────────────────────────── */}
      {isAdjusted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3px 2px 6px', flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 7, color: CC.amber, fontFamily: CC.font, letterSpacing: '0.03em' }}>
            Adjusted CCS active: excluding {disabledColNames.join(', ')}
          </span>
          <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>
            Active max: <span style={{ color: CC.text, fontWeight: 700 }}>{activeMax}</span> / 100
          </span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '0 4px', padding: '3px 2px 4px 0', borderBottom: `1px solid rgba(255,255,255,0.07)`, marginBottom: 1, minWidth: 680 }}>
        <span style={{ fontSize: 6, color: CC.dim, opacity: 0.3 }}>#</span>
        {visibleCols.map(col => {
          const isOff = disabledCols.has(col.key);
          const labelColor = isOff ? 'rgba(100,116,139,0.45)' : CC.dim;
          return (
            <span
              key={col.key}
              style={{ ...hdr, color: labelColor, cursor: 'pointer' }}
              onClick={() => handleSort(col.key)}
              title={isOff ? 'Excluded from adjusted CCS. Use Score Lens above to include.' : (col.title ?? col.label)}
            >
              {isOff && <span style={{ marginRight: 2, fontSize: 5, opacity: 0.6 }}>⊘</span>}
              {col.label}
              {' '}{sortArrow(col.key)}
            </span>
          );
        })}
      </div>

      {/* ── Data rows ────────────────────────────────────────────────── */}
      {sorted.map((r, i) => {
        const ticker     = fmtTicker(r);
        const company    = fmtCompany(r);
        const v42        = readV42(r);
        const ccs        = r.caelyn_confluence_score != null ? Number(r.caelyn_confluence_score) : null;
        const maxScr     = v42?.score.total_max ?? r.caelyn_confluence_v42_max_score ?? 125;
        const confNum    = v42 ? v42.metadata.confidence_score : (r.caelyn_confluence_confidence_score ?? r.caelyn_confluence_v42_confidence_score ?? null);

        const comps      = v42?.components ?? {};
        const themePts   = comps.theme?.points ?? getV42Pts(r, 'theme_alignment_points', 'theme_alignment');
        const themeName  = r.canonical_theme_name ?? r.leadership_theme ?? (typeof r.theme === 'string' ? r.theme : (r.theme?.name ?? null));
        const stagePts   = comps.technical_setup?.points ?? getV42Pts(r, 'technical_setup_points', 'technical_setup') ?? comps.stage?.points ?? getV42Pts(r, 'stage_quality_points', 'stage_quality');
        const stageMax   = comps.technical_setup?.points != null ? 8 : (comps.stage?.points != null ? 15 : 8);
        const stageLabel = comps.technical_setup?.label ?? r.technical_setup_label ?? (r.stage_quality_score != null ? `Score ${Math.round(r.stage_quality_score)}` : null);
        const entryPts   = comps.entry_exit?.points ?? getV42Pts(r, 'entry_exit_points', 'entry_exit') ?? getV42Pts(r, 'entry_risk_reward_points', 'entry');
        const entryStatus= comps.entry_exit?.reason_codes?.[0] ?? r.entry_exit_status ?? r.entry?.state ?? null;
        const catPts     = comps.catalyst?.points ?? getV42Pts(r, 'catalyst_alignment_points', 'catalyst_alignment');
        const catType    = r.direct_catalyst_type ?? (r.direct_catalyst_present ? 'Present' : null);
        const catLkgSrc  = r.catalyst_lkg_source ?? null;
        const catWarming = catLkgSrc === 'unavailable_cold_start';
        const invPts     = comps.investment?.points ?? getV42Pts(r, 'investment_alignment_points', 'investment_alignment');
        const invLabel   = comps.investment?.quality_label ?? r.investment_quality_label ?? null;
        const invPillars = comps.investment?.pillar_count ?? r.investment_pillar_count ?? null;
        const valPts: number | null =
          comps.valuation?.points != null ? Number(comps.valuation.points)
          : r.valuation_alignment_points != null ? Number(r.valuation_alignment_points)
          : r.confluence_v42?.components?.valuation?.points != null ? Number(r.confluence_v42.components.valuation.points)
          : r.confluence_v42?.valuation_alignment_points != null ? Number(r.confluence_v42.valuation_alignment_points)
          : null;
        const valLabel: string | null =
          comps.valuation?.label ?? comps.valuation?.quality_label ?? r.valuation_label
          ?? r.valuation_coverage_status ?? r.confluence_v42?.valuation_label
          ?? r.confluence_v42?.components?.valuation?.label ?? null;
        const adjCCS     = isAdjusted ? computeAdjustedCCS(r) : null;
        const canonCore  = v42 ? v42.score.core : ccs;
        const displayScore = isAdjusted && adjCCS != null ? adjCCS : canonCore;
        const ccsClr     = displayScore != null ? ccsColor(displayScore) : CC.dim;
        const dimStyle   = (key: SortKey): React.CSSProperties => disabledCols.has(key) ? { opacity: 0.28 } : {};

        const ccsTooltip = v42
          ? `Core: ${v42.score.core.toFixed(1)} / 100\nBonus: +${v42.score.bonus.toFixed(1)} / 25\nTotal: ${v42.score.total.toFixed(1)}${isAdjusted ? `\nAdj: ${adjCCS != null ? adjCCS.toFixed(1) : '—'} (max ${activeMax})` : ''}`
          : `max ${maxScr}`;

        const cellFor = (key: SortKey): React.ReactNode => {
          switch (key) {
            case 'ticker': return (
              <div style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: CC.text, fontFamily: CC.font, whiteSpace: 'nowrap' as const }}>{ticker}</div>
                {company && <div style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 88 }}>{company}</div>}
              </div>
            );
            case 'confluence': return (
              <div title={ccsTooltip} style={{ cursor: 'help' }}>
                {isAdjusted && adjCCS != null
                  ? <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: ccsClr, fontFamily: CC.font }}>
                        {adjCCS.toFixed(1)} <span style={{ fontSize: 6, fontWeight: 400, color: CC.amber }}>adj</span>
                      </div>
                      <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font, opacity: 0.65 }}>
                        {canonCore != null ? canonCore.toFixed(1) : '—'} orig
                      </div>
                    </>
                  : v42
                    ? <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: ccsClr, fontFamily: CC.font }}>{v42.score.core.toFixed(1)}</div>
                        <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font }}>/100 · <span style={{ color: v42.score.bonus > 0 ? CC.purple : CC.dim }}>+{v42.score.bonus.toFixed(1)}</span></div>
                      </>
                    : ccs != null
                      ? <>
                          <div style={{ fontSize: 10, fontWeight: 700, color: ccsClr, fontFamily: CC.font }}>{ccs.toFixed(1)}</div>
                          <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font }}>/ {maxScr}</div>
                        </>
                      : <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>}
              </div>
            );
            case 'decision': return (
              <div>
                <DecisionBadge state={v42?.action.label ?? r.actionability_state ?? r.caelyn_confluence_v42_actionability ?? null} display={v42?.action.label_display} />
                {(v42?.action.execution_label ?? r.entry_execution_label) && (
                  <div style={{ fontSize: 6, color: CC.amber, fontFamily: CC.font, marginTop: 2, whiteSpace: 'nowrap' as const }}>
                    {v42?.action.execution_label ?? r.entry_execution_label}
                  </div>
                )}
              </div>
            );
            case 'setup': return (
              <div style={dimStyle('setup')}>
                {stagePts != null
                  ? <><div style={{ fontSize: 9, fontWeight: 700, color: ptsColor(stagePts, stageMax), fontFamily: CC.font }}>{stagePts.toFixed(1)} / {stageMax}</div>
                      {stageLabel && <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{stageLabel}</div>}</>
                  : <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>}
              </div>
            );
            case 'theme': return (
              <div title={themeName ?? ''} style={dimStyle('theme')}>
                {themePts != null
                  ? <><div style={{ fontSize: 9, fontWeight: 700, color: ptsColor(themePts, 15), fontFamily: CC.font }}>{themePts.toFixed(1)} / 15</div>
                      {themeName && <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{themeName.replace(/_/g, ' ')}</div>}</>
                  : <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>}
              </div>
            );
            case 'options': return (
              <div style={dimStyle('options')}><OptionsStatusCell row={r} /></div>
            );
            case 'entry_exit': return (
              <div style={dimStyle('entry_exit')}>
                {entryPts != null
                  ? <><div style={{ fontSize: 9, fontWeight: 700, color: ptsColor(entryPts, 12), fontFamily: CC.font }}>{entryPts.toFixed(1)} / 12</div>
                      {entryStatus && <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{String(entryStatus).replace(/_/g, ' ')}</div>}</>
                  : <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>}
              </div>
            );
            case 'catalyst': return (
              <div title={catLkgSrc ?? ''} style={dimStyle('catalyst')}>
                {catWarming
                  ? <span style={{ fontSize: 7, fontWeight: 600, color: CC.amber, fontFamily: CC.font }}>Warming</span>
                  : catPts != null
                    ? <><div style={{ fontSize: 9, fontWeight: 700, color: ptsColor(catPts, 12), fontFamily: CC.font }}>{catPts.toFixed(1)} / 12</div>
                        {catType && <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{catType}</div>}</>
                    : <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>}
              </div>
            );
            case 'investment': return (
              <div style={dimStyle('investment')}>
                {invPts != null
                  ? <><div style={{ fontSize: 9, fontWeight: 700, color: ptsColor(invPts, 12), fontFamily: CC.font }}>{invPts.toFixed(1)} / 12</div>
                      <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {invLabel ?? (invPillars != null ? `${invPillars}/3 pillars` : '')}
                      </div></>
                  : <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>}
              </div>
            );
            case 'valuation': return (
              <div style={dimStyle('valuation')}>
                {valPts != null
                  ? <><div style={{ fontSize: 9, fontWeight: 700, color: ptsColor(valPts, 8), fontFamily: CC.font }}>{valPts.toFixed(1)} / 8</div>
                      {valLabel && <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{valLabel}</div>}</>
                  : <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>}
              </div>
            );
            case 'bonuses': return <BonusCell row={r} />;
            case 'confidence': return (
              <div title="Data completeness / trustworthiness — not bullishness">
                {confNum != null
                  ? <div style={{ fontSize: 9, fontWeight: 700, color: confNum >= 80 ? CC.green : confNum >= 50 ? CC.amber : CC.red, fontFamily: CC.font }}>{Math.round(confNum)}%</div>
                  : <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>—</span>}
              </div>
            );
            default: return null;
          }
        };

        return (
          <div
            key={`v42-${ticker}-${i}`}
            style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '0 4px', padding: '4px 2px', borderBottom: `1px solid rgba(255,255,255,0.05)`, alignItems: 'center', cursor: 'pointer', minWidth: 680, background: 'transparent', transition: 'background 0.1s' }}
            onClick={() => onTickerClick?.(ticker)}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: 6, color: CC.dim, opacity: 0.3 }}>{i + 1}</span>
            {visibleCols.map(col => (
              <div key={col.key} style={{ display: 'contents' }}>{cellFor(col.key)}</div>
            ))}
          </div>
        );
      })}

    </div>
  );
}

/* TabAllConfluence = V4.2.1 screener with no row filter */
function TabAllConfluence({ rows, onTickerClick }: { rows: any[]; onTickerClick?: (t: string) => void }) {
  return <V42ScreenerTable rows={rows} onTickerClick={onTickerClick} />;
}

/* ─── Tab: Actionable Setups ─────────────────────────────────────── */

function isExcludedFromSetups(r: any, action: ActionabilityState): boolean {
  /* Backend bucket is authoritative when present */
  const bucket = r.caelyn_confluence_bucket;
  if (bucket) {
    if (EXCLUDED_BUCKETS.has(bucket)) return true;
    if (!ACTIONABLE_BUCKETS.has(bucket)) return true;
  }
  if (action === 'TOO_EXTENDED' || action === 'SUPPORT_LOST') return true;
  const errState = (r.entry_risk_reward_state ?? r.actionability?.entry_risk_reward_state ?? '').toUpperCase();
  if (errState === 'STRONG_ASSET_EXTENDED_WAIT' || errState === 'BROKEN_SUPPORT_AVOID') return true;
  const beAct = typeof r.actionability === 'string' ? r.actionability.toUpperCase() : '';
  if (beAct === 'TOO_EXTENDED' || beAct === 'AVOID' || beAct === 'BROKEN_SUPPORT_AVOID') return true;
  const es = rawEntryState(r);
  if (es === 'LOWER_LOW_CONFIRMED' || es === 'FAILED_BREAKOUT') return true;
  const as = getActiveSupportInfo(r);
  if (as.isConfirmedLoss) return true;
  const { tm } = stageMeta(r);
  const ext = (tm.extension_risk ?? '').toLowerCase();
  if (ext === 'extreme_extension' || ext === 'vertical' || ext === 'crowded_move') return true;
  return false;
}

function TabActionableSetups({ rows, onTickerClick }: { rows: any[]; onTickerClick?: (t: string) => void }) {
  const sorted = useMemo(() => {
    return [...rows]
      .map(r => ({
        r,
        action: deriveActionability(r),
        ccs:    Number(r.caelyn_confluence_score ?? 0),
        trade:  getTradeScore(r),
        cat:    Number(r.catalyst_alignment_score ?? r.catalyst?.alignment_score ?? r.catalyst?.score ?? 0),
        opts:   getOptionsInfo(r).alignScore ?? 0,
        errScr: Number(r.entry_risk_reward_score ?? r.actionability?.entry_risk_reward_score ?? 0),
      }))
      .filter(x => !isExcludedFromSetups(x.r, x.action))
      .sort((a, b) => {
        /* Sort by caelyn_confluence_score first when available */
        if (b.ccs !== a.ccs) return b.ccs - a.ccs;
        const d = actionPriority(a.action) - actionPriority(b.action);
        if (d !== 0) return d;
        if (b.trade !== a.trade) return b.trade - a.trade;
        if (b.errScr !== a.errScr) return b.errScr - a.errScr;
        if (b.cat !== a.cat) return b.cat - a.cat;
        return b.opts - a.opts;
      })
      .slice(0, 12).map(x => x.r);
  }, [rows]);
  if (!sorted.length) return <EmptyState msg="No actionable setups in current watchlist." />;
  return <CardGrid rows={sorted} onTickerClick={onTickerClick} />;
}

/* ─── Tab: Investment Quality ────────────────────────────────────── */

function invEntryLabel(r: any): { label: string; clr: string } {
  const bucket   = r.caelyn_confluence_bucket ?? '';
  const action   = deriveActionability(r);
  const errState = (r.entry_risk_reward_state ?? r.actionability?.entry_risk_reward_state ?? '').toUpperCase();
  const as       = getActiveSupportInfo(r);
  const beAct    = typeof r.actionability === 'string' ? r.actionability.toUpperCase() : '';

  /* CONFIRMED break evidence required for Broken/Risk label (Part 3) */
  const isTrulyBroken =
    bucket === 'RISK_CONFLICT' ||
    as.status === 'lost_confirmed' ||
    as.lowerLowConfirmed ||
    errState === 'BROKEN_SUPPORT_AVOID' ||
    beAct === 'AVOID';

  if (isTrulyBroken) return { label: 'Investment — Broken / Risk', clr: CC.red };

  /* prior_pivot_status = lost_now_overhead with active support still intact → nuanced label */
  const priorLost = as.priorPivotStatus === 'lost_now_overhead';
  const activeIntact = ['above_support', 'testing_support', 'bounced_from_support'].includes(as.status ?? '');
  if (priorLost && activeIntact) return { label: 'Prior Pivot Lost — Active Support Intact', clr: CC.amber };
  if (priorLost && !activeIntact) return { label: 'Support Test / Reclaim Needed', clr: CC.amber };

  /* Extension without break */
  if (errState === 'STRONG_ASSET_EXTENDED_WAIT' || action === 'TOO_EXTENDED' || bucket === 'WATCH_FOR_RESET')
    return { label: 'Strong Investment — Entry Extended', clr: CC.amber };

  /* Near support */
  if (as.status === 'testing_support') return { label: 'Strong Investment — Support Test (Constructive)', clr: CC.teal };
  if (as.status === 'bounced_from_support' || bucket === 'CONFLUENCE_AT_SUPPORT')
    return { label: 'Strong Investment — Near Support', clr: CC.teal };

  if (bucket === 'NEAR_ACTIONABLE') return { label: 'Strong Investment — Watch for Reset', clr: CC.blue };
  if (bucket === 'ACTIONABLE') return { label: 'Strong Investment — Actionable', clr: CC.green };
  return { label: 'Strong Investment', clr: CC.green };
}

function TabInvestmentQuality({ rows, onTickerClick }: { rows: any[]; onTickerClick?: (t: string) => void }) {
  const sorted = useMemo(() => {
    return [...rows]
      .map(r => ({
        r,
        inv:   getInvScore(r),
        ccs:   Number(r.caelyn_confluence_score ?? 0),
        trade: getTradeScore(r),
      }))
      .sort((a, b) => {
        if (a.inv !== null && b.inv !== null) return b.inv - a.inv;
        if (a.inv !== null) return -1;
        if (b.inv !== null) return 1;
        if (b.ccs !== a.ccs) return b.ccs - a.ccs;
        return b.trade - a.trade;
      })
      .slice(0, 12)
      .map(x => x.r);
  }, [rows]);
  const allUnavailable = rows.every(r => getInvScore(r) === null);

  const dim  = { fontSize: 8, color: CC.dim, fontFamily: CC.font } as const;

  return (
    <>
      {allUnavailable && (
        <div style={{ padding: '0 0 8px', fontSize: 8, color: CC.dim, fontFamily: CC.font }}>
          Investment Alignment score not yet available. Ranked by Confluence then Trade signal as proxy.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
        {sorted.map((r, i) => {
          const { label: entryLabel, clr: entryClr } = invEntryLabel(r);
          const inv = getInvScore(r);
          const reason = inv === null ? getInvUnavailableReason(r) : null;
          const ticker = fmtTicker(r);
          const company = fmtCompany(r);
          const catScore = r.catalyst_alignment_score ?? r.catalyst?.alignment_score ?? r.catalyst?.score ?? null;
          const catNum = catScore != null && Number.isFinite(Number(catScore)) ? Math.round(Number(catScore)) : null;
          const ccs = r.caelyn_confluence_score != null ? Math.round(Number(r.caelyn_confluence_score)) : null;
          const trade = getTradeScore(r);
          const errState = r.entry_risk_reward_state ?? r.actionability?.entry_risk_reward_state ?? null;
          return (
            <div key={`iq-${ticker}-${i}`} style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div>
                  <div
                    onClick={() => onTickerClick?.(ticker)}
                    style={{ fontSize: 12, fontWeight: 800, color: onTickerClick ? CC.teal : '#fff', fontFamily: CC.font, cursor: onTickerClick ? 'pointer' : 'default', textDecoration: onTickerClick ? 'underline' : 'none' }}
                  >{ticker}</div>
                  {company && <div style={{ ...dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 130 }}>{company}</div>}
                </div>
                <BucketBadge bucket={r.caelyn_confluence_bucket} />
              </div>
              {/* Entry label */}
              <span style={{ fontSize: 8, fontWeight: 700, color: entryClr, fontFamily: CC.font }}>{entryLabel}</span>
              {/* Scores */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
                {inv !== null
                  ? <ScoreChip label="Investment" value={inv} color={scoreColor(inv)} />
                  : <span style={{ display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: 6, color: CC.dim, textTransform: 'uppercase' as const, fontFamily: CC.font }}>Investment</span>
                      <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font, maxWidth: 80, textAlign: 'center' as const, lineHeight: 1.2 }}>{reason}</span>
                    </span>
                }
                {ccs !== null && <ScoreChip label="CCS" value={ccs} color={scoreColor(ccs)} />}
                <ScoreChip label="Trade" value={trade} color={scoreColor(trade)} />
                {catNum !== null && <ScoreChip label="Catalyst" value={catNum} color={scoreColor(catNum)} />}
              </div>
              {errState && (
                <span style={{ ...dim, fontSize: 7, color: errState === 'BROKEN_SUPPORT_AVOID' ? CC.red : CC.amber }}>
                  {errState.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── Tab: Theme Policy Tailwinds ────────────────────────────────── */

function TabThemePolicy({ rows, onTickerClick }: { rows: any[]; onTickerClick?: (t: string) => void }) {
  const policyRows = useMemo(
    () => rows.filter(r => getThemePolicyInfo(r).available),
    [rows],
  );
  if (!policyRows.length) {
    const cntAvail  = rows.filter(r => r.theme_policy_available === true).length;
    const cntBoost  = rows.filter(r => r.theme_policy_boost && Number(r.theme_policy_boost) > 0).length;
    const cntEvent  = rows.filter(r => !!r.theme_policy_event).length;
    const cntNested = rows.filter(r => r.catalyst?.theme_policy_boost && Number(r.catalyst.theme_policy_boost) > 0).length;
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' as const, fontFamily: CC.font }}>
        <div style={{ fontSize: 9, color: CC.dim, lineHeight: 1.7 }}>
          No Theme Policy tailwinds detected in current watchlist.<br />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>
            Rows scanned: {rows.length} · theme_policy_available: {cntAvail} · theme_policy_boost{'>'}: 0: {cntBoost} · theme_policy_event: {cntEvent} · catalyst.theme_policy_boost: {cntNested}
          </span>
        </div>
      </div>
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
            <div style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, marginTop: 5, display: 'flex', flexWrap: 'wrap' as const, gap: 4, alignItems: 'center' }}>
              <span>Affected ({trows.length}):</span>
              {trows.slice(0, 12).map((r, i) => {
                const t = fmtTicker(r);
                return (
                  <span
                    key={`${t}-${i}`}
                    onClick={() => onTickerClick?.(t)}
                    style={{ cursor: onTickerClick ? 'pointer' : 'default', color: onTickerClick ? CC.teal : CC.dim, textDecoration: onTickerClick ? 'underline' : 'none', fontWeight: onTickerClick ? 700 : 400 }}
                  >{t}</span>
                );
              })}
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

function TabCatalysts({ rows, onTickerClick }: { rows: any[]; onTickerClick?: (t: string) => void }) {
  const catItems = useMemo(() => {
    return [...rows]
      .map(r => {
        const cat      = getCatalystInfo(r);
        const rawScore = r.catalyst_alignment_score ?? r.catalyst?.alignment_score ?? r.catalyst?.score ?? null;
        const catScore = rawScore != null && Number.isFinite(Number(rawScore)) ? Number(rawScore) : null;
        const hasEvent = !!cat;
        const hasScore = catScore != null && catScore > 0;
        return { r, cat, catScore, hasEvent, hasScore };
      })
      .filter(x => x.hasEvent || x.hasScore)
      .sort((a, b) => (b.catScore ?? 0) - (a.catScore ?? 0))
      .slice(0, 20);
  }, [rows]);

  if (!catItems.length) {
    const cntFlatPrimary   = rows.filter(r => !!r.catalyst_primary_event).length;
    const cntFlatRss       = rows.filter(r => !!r.catalyst_rss_event).length;
    const cntFlatSched     = rows.filter(r => !!r.catalyst_scheduled_event).length;
    const cntFlatV2        = rows.filter(r => !!r.catalyst_v2_primary_event).length;
    const cntNestedPrimary = rows.filter(r => !!r.catalyst?.primary_event).length;
    const cntNestedRss     = rows.filter(r => !!r.catalyst?.rss_event).length;
    const cntScore         = rows.filter(r => (r.catalyst_alignment_score ?? r.catalyst?.alignment_score ?? r.catalyst?.score ?? 0) > 0).length;
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' as const, fontFamily: CC.font }}>
        <div style={{ fontSize: 9, color: CC.dim, lineHeight: 1.7 }}>
          No catalyst events or scores detected in current watchlist.<br />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>
            Rows scanned: {rows.length} · catalyst_primary_event: {cntFlatPrimary} · catalyst_rss_event: {cntFlatRss} · catalyst_scheduled_event: {cntFlatSched} · catalyst_v2_primary_event: {cntFlatV2}<br />
            catalyst.primary_event: {cntNestedPrimary} · catalyst.rss_event: {cntNestedRss} · catalyst score{'>'} 0: {cntScore}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      {catItems.map(({ r, cat, catScore, hasEvent }, i) => {
        const ticker = fmtTicker(r);
        return (
          <div key={`cat-${ticker}-${i}`} style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span
                onClick={() => onTickerClick?.(ticker)}
                style={{ fontSize: 12, fontWeight: 800, color: onTickerClick ? CC.teal : '#fff', fontFamily: CC.font, cursor: onTickerClick ? 'pointer' : 'default', textDecoration: onTickerClick ? 'underline' : 'none' }}
              >{ticker}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {catScore != null && <span style={{ fontSize: 9, color: scoreColor(catScore), fontWeight: 700, fontFamily: CC.font }}>Score {Math.round(catScore)}</span>}
                {cat?.state && <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 2, background: 'rgba(255,255,255,0.06)', color: CC.dim, fontFamily: CC.font }}>{cat.state}</span>}
                {!hasEvent && <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 2, background: 'rgba(245,158,11,0.12)', color: CC.amber, fontFamily: CC.font }}>event details unavailable</span>}
              </div>
            </div>
            {hasEvent && cat
              ? <span style={{ fontSize: 8, color: CC.amber, fontFamily: CC.font, lineHeight: 1.4 }}>● {cat.eventTitle}</span>
              : <span style={{ fontSize: 8, color: 'rgba(245,158,11,0.5)', fontFamily: CC.font, fontStyle: 'italic' as const }}>Catalyst score {catScore != null ? Math.round(catScore) : '?'} — event details unavailable from backend shape</span>
            }
            {cat?.eventType && <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Type: {cat.eventType}</span>}
            {cat?.source && <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Source: {fmtSource(cat.source)}</span>}
            {cat?.published && <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Published: {String(cat.published).slice(0, 10)}</span>}
            {cat?.pBoost != null && <span style={{ fontSize: 8, color: CC.purple, fontFamily: CC.font }}>Theme Policy: +{cat.pBoost}</span>}
            {cat?.bearish && <span style={{ fontSize: 8, color: CC.red, fontFamily: CC.font }}>⚠ Conflict: {fmtCatalystEvent(cat.bearish)}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tab: Risk / Conflicts ──────────────────────────────────────── */

function TabRisk({ rows, onTickerClick }: { rows: any[]; onTickerClick?: (t: string) => void }) {
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
      const errState    = (r.entry_risk_reward_state ?? r.actionability?.entry_risk_reward_state ?? '').toUpperCase();
      const bucket      = r.caelyn_confluence_bucket ?? '';
      const beAct       = typeof r.actionability === 'string' ? r.actionability.toUpperCase() : '';

      /* Bucket-based inclusion (Part 6 spec) */
      if (bucket === 'RISK_CONFLICT')                              risks.push('Risk / Conflict bucket');
      if (bucket === 'WATCH_FOR_RESET')                           risks.push('Watch for Reset bucket');
      /* Field-based flags */
      if (cat?.bearish)                                           risks.push('Bearish catalyst conflict');
      if (as.lowerLowConfirmed)                                   risks.push('Lower-low confirmed');
      if (errState === 'BROKEN_SUPPORT_AVOID')                    risks.push('Broken support — avoid');
      if (as.status === 'lost_confirmed')                         risks.push('Confirmed support lost');
      if (beAct === 'AVOID')                                      risks.push('Actionability: Avoid');
      if (errState === 'STRONG_ASSET_EXTENDED_WAIT')              risks.push('Strong asset — extended, wait');
      if (action === 'TOO_EXTENDED')                              risks.push('Vertical / extreme extension');
      if (as.status === 'broken_unconfirmed')                     risks.push('Support break unconfirmed');
      if (es === 'LOWER_HIGH_WARNING')                            risks.push('Lower-high warning');
      if (as.status === 'testing_support')                        risks.push('Testing active support');
      if (es === 'SUPPORT_TEST' && !as.hasActiveSupport)          risks.push('Testing support');
      if (optConflict && opts.sigLabel)                           risks.push(`Options ${opts.sigLabel} — entry conflict`);
      if (inv !== null && inv < 40 && trade > 65)                 risks.push('Hot trade / weak investment quality');
      if (as.priorPivotStatus === 'lost_now_overhead')            risks.push('Prior pivot lost — overhead resistance');

      if (!risks.length) continue;

      const detail =
        bucket === 'RISK_CONFLICT'
          ? `Backend flags as Risk / Conflict — ${risks.filter(r => r !== 'Risk / Conflict bucket').join(', ') || 'review structure before entry'}.`
        : as.lowerLowConfirmed || as.status === 'lost_confirmed'
          ? `Confirmed support lost${as.zoneDisplay ? ` (was ${as.zoneDisplay})` : ''}. Wait for base rebuild.${as.reclaim != null ? ` Reclaim level: ${as.reclaim.toFixed(2)}.` : ''}`
        : as.status === 'broken_unconfirmed'
          ? `Support break not yet confirmed. Watch for close below${as.criticalBreak != null ? ` ${as.criticalBreak.toFixed(2)}` : ' key level'}.`
        : as.status === 'testing_support'
          ? `Testing active support${as.zoneDisplay ? ` around ${as.zoneDisplay}` : ''}. Holding is constructive.`
        : errState === 'STRONG_ASSET_EXTENDED_WAIT' || bucket === 'WATCH_FOR_RESET'
          ? 'Extended beyond normal range or flagged for reset — waiting for pullback before re-entry.'
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
        const csa = Number(a.r.caelyn_confluence_score ?? 0);
        const csb = Number(b.r.caelyn_confluence_score ?? 0);
        return csb - csa;
      })
      .slice(0, 20);
  }, [rows]);

  if (!riskEntries.length) {
    const cntBucketRisk  = rows.filter(r => r.caelyn_confluence_bucket === 'RISK_CONFLICT').length;
    const cntBucketWatch = rows.filter(r => r.caelyn_confluence_bucket === 'WATCH_FOR_RESET').length;
    const cntErrBroken   = rows.filter(r => (r.entry_risk_reward_state ?? '').toUpperCase() === 'BROKEN_SUPPORT_AVOID').length;
    const cntErrExt      = rows.filter(r => (r.entry_risk_reward_state ?? '').toUpperCase() === 'STRONG_ASSET_EXTENDED_WAIT').length;
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' as const, fontFamily: CC.font }}>
        <div style={{ fontSize: 9, color: CC.dim, lineHeight: 1.7 }}>
          No significant risk flags detected.<br />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>
            Rows scanned: {rows.length} · RISK_CONFLICT bucket: {cntBucketRisk} · WATCH_FOR_RESET bucket: {cntBucketWatch} · BROKEN_SUPPORT_AVOID: {cntErrBroken} · STRONG_ASSET_EXTENDED_WAIT: {cntErrExt}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      {riskEntries.map(({ r, sev, risks, detail }, i) => {
        const ticker = fmtTicker(r);
        const trade  = getTradeScore(r);
        return (
          <div key={`risk-${ticker}-${i}`} style={{ background: CC.card, border: `1px solid ${CC.red}35`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span
                onClick={() => onTickerClick?.(ticker)}
                style={{ fontSize: 12, fontWeight: 800, color: onTickerClick ? CC.teal : '#fff', fontFamily: CC.font, cursor: onTickerClick ? 'pointer' : 'default', textDecoration: onTickerClick ? 'underline' : 'none' }}
              >{ticker}</span>
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

/* ─── V4.2.1 Detail Drawer ────────────────────────────────────────── */

function V42DetailDrawer({ row, onClose }: { row: any; onClose: () => void }) {
  const ticker  = fmtTicker(row);
  const company = fmtCompany(row);

  const [alphaData, setAlphaData] = useState<any | null>(null);
  const [alphaLoading, setAlphaLoading] = useState(false);
  const [showDebug, setShowDebug]       = useState(false);

  useEffect(() => {
    if (!ticker) return;
    setAlphaLoading(true);
    fetch(`/api/alpha/confluence/${encodeURIComponent(ticker)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setAlphaData(d ?? null); setAlphaLoading(false); })
      .catch(() => setAlphaLoading(false));
  }, [ticker]);

  const v42  = (alphaData?.confluence_v42 ?? readV42(row)) as V42Shape | null;
  const sc   = v42?.score;
  const act  = v42?.action;
  const comps= v42?.components ?? {};
  const bon  = v42?.bonuses;
  const risk = v42?.risk;
  const meta = v42?.metadata;
  const tech = (alphaData?.confluence_v42?.technical ?? v42?.technical) as V42Technical | undefined;
  const ccs  = row.caelyn_confluence_score != null ? Number(row.caelyn_confluence_score) : sc?.total ?? null;

  const sec:  React.CSSProperties = { marginBottom: 12 };
  const lbl_: React.CSSProperties = { fontSize: 7, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: CC.teal, fontFamily: CC.font, marginBottom: 4, display: 'block' };
  const rr:   React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` };
  const kk:   React.CSSProperties = { fontSize: 8, color: CC.dim, fontFamily: CC.font };
  const vv:   React.CSSProperties = { fontSize: 8, color: CC.text, fontWeight: 600, fontFamily: CC.font };

  function DR({ k, v, clr }: { k: string; v?: string | number | null; clr?: string }) {
    if (v == null || v === '') return null;
    return <div style={rr}><span style={kk}>{k}</span><span style={{ ...vv, color: clr ?? CC.text }}>{String(v)}</span></div>;
  }
  function PR({ k, pts, max, raw, clr }: { k: string; pts: number | null; max: number; raw?: number | null; clr?: string }) {
    if (pts == null) return null;
    const c = clr ?? ptsColor(pts, max);
    return (
      <div style={rr}>
        <span style={kk}>{k}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {raw != null && <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font }}>qual {Math.round(raw)}</span>}
          <MiniBar value={(pts / max) * 100} color={c} />
          <span style={{ ...vv, color: c, width: 64, textAlign: 'right' as const }}>{pts.toFixed(1)} / {max}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998 }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 380, zIndex: 9999, background: '#0a0a0e', borderLeft: `1px solid rgba(255,255,255,0.08)`, display: 'flex', flexDirection: 'column' as const, overflowY: 'auto' as const }}>

        {/* Header */}
        <div style={{ padding: '11px 14px', borderBottom: `1px solid rgba(255,255,255,0.07)`, position: 'sticky', top: 0, background: '#0a0a0e', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: CC.teal, fontFamily: CC.font }}>{ticker}</div>
              {company && <div style={{ fontSize: 9, color: CC.dim, fontFamily: CC.font, marginTop: 2 }}>{company}</div>}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: CC.dim, fontSize: 20, cursor: 'pointer', padding: '0 4px', fontFamily: CC.font, lineHeight: 1 }}>×</button>
          </div>
          {sc != null && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: ccsColor(sc.core), fontFamily: CC.font }}>{sc.core.toFixed(1)}</span>
                <span style={{ fontSize: 10, color: CC.dim, fontFamily: CC.font }}>/100</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: CC.purple, fontFamily: CC.font }}>+{sc.bonus.toFixed(1)}</span>
                <span style={{ fontSize: 9, color: CC.dim, fontFamily: CC.font }}>bonus</span>
                {act && <DecisionBadge state={act.label} display={act.label_display} />}
              </div>
              <div style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, marginTop: 2 }}>
                Total {sc.total.toFixed(1)} · Core max 100 · Bonus max 25
                {alphaLoading && <span style={{ marginLeft: 8, color: CC.amber }}>loading…</span>}
              </div>
            </div>
          )}
          {sc == null && ccs != null && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: ccsColor(ccs), fontFamily: CC.font }}>{ccs.toFixed(1)}</span>
              {alphaLoading && <span style={{ fontSize: 9, color: CC.amber, fontFamily: CC.font }}>loading…</span>}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '10px 14px', flex: 1 }}>

          {/* Action: bucket + why_now / why_wait */}
          {act && (
            <div style={sec}>
              <span style={lbl_}>Action</span>
              <DR k="Decision"   v={act.label_display}   clr={DECISION_BADGE[act.label]?.clr} />
              {act.execution_label && <DR k="Timing" v={act.execution_label} clr={CC.amber} />}
              <DR k="Bucket"     v={act.bucket?.replace(/_/g, ' ')} />
              {act.invalidation_level != null && <DR k="Invalidation" v={`$${Number(act.invalidation_level).toFixed(2)}`} clr={CC.red} />}
              {act.target_zone?.target_1 && <DR k="Target 1"    v={`$${Number(act.target_zone.target_1).toFixed(2)}`} clr={CC.green} />}
              {act.target_zone?.target_2 && <DR k="Target 2"    v={`$${Number(act.target_zone.target_2).toFixed(2)}`} clr={CC.teal} />}
              {act.target_zone?.risk_reward_ratio != null && <DR k="Risk/Reward" v={`${Number(act.target_zone.risk_reward_ratio).toFixed(1)}x`} />}
              {act.why_now?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 7, color: CC.green, fontFamily: CC.font, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Why Now</span>
                  {act.why_now.map((b: string, i: number) => (
                    <div key={i} style={{ fontSize: 8, color: CC.text, fontFamily: CC.font, paddingLeft: 8, paddingTop: 2, lineHeight: 1.4 }}>· {b}</div>
                  ))}
                </div>
              )}
              {act.why_wait?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 7, color: CC.amber, fontFamily: CC.font, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Why Wait</span>
                  {act.why_wait.map((b: string, i: number) => (
                    <div key={i} style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, paddingLeft: 8, paddingTop: 2, lineHeight: 1.4 }}>· {b}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Risk Flags — true risk warnings */}
          {risk?.risk_flags?.length > 0 && (
            <div style={sec}>
              <span style={lbl_}>⚠ Risk Flags</span>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {risk.risk_flags.map((f: string, i: number) => (
                  <span key={i} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', color: CC.red, fontFamily: CC.font, fontWeight: 700 }}>{f.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}

          {/* Caution Flags — amber warnings, not hard risk */}
          {(risk?.caution_flags ?? []).length > 0 && (
            <div style={sec}>
              <span style={lbl_}>⚡ Caution Flags</span>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {(risk!.caution_flags!).map((f: string, i: number) => (
                  <span key={i} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(245,158,11,0.14)', color: CC.amber, fontFamily: CC.font, fontWeight: 700 }}>{f.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}

          {/* Data Coverage — neutral, not bearish */}
          {meta?.data_status_flags?.length > 0 && (
            <div style={sec}>
              <span style={lbl_}>Data Coverage</span>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {meta.data_status_flags.map((f: string, i: number) => (
                  <span key={i} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: CC.dim, fontFamily: CC.font }}>{f.replace(/_/g, ' ')}</span>
                ))}
              </div>
              <div style={{ fontSize: 7, color: 'rgba(169,170,166,0.5)', fontFamily: CC.font, marginTop: 4 }}>Coverage gaps — not bearish signals</div>
            </div>
          )}

          {/* Score Breakdown */}
          {sc && (
            <div style={sec}>
              <span style={lbl_}>Score Breakdown</span>
              <PR k="Core Score"  pts={sc.core}  max={sc.core_max ?? 100} />
              <PR k="Bonus Score" pts={sc.bonus} max={sc.bonus_max ?? 25} clr={CC.purple} />
              {meta?.confidence_score != null && meta.confidence_score > 0 && (
                <DR k="Confidence" v={`${meta.confidence_score.toFixed(0)}%`}
                   clr={meta.confidence_score >= 80 ? CC.green : meta.confidence_score >= 50 ? CC.amber : CC.red} />
              )}
            </div>
          )}

          {/* Components — raw_score (quality) + points (contribution) */}
          {Object.keys(comps).length > 0 && (
            <div style={sec}>
              <span style={lbl_}>Components</span>
              {([
                ['theme',          'Theme',           15],
                ['stage',          'Stage',           15],
                ['technical_setup','Technical Setup',  8],
                ['options',        'Options',         18],
                ['entry_exit',     'Entry / Exit',    12],
                ['catalyst',       'Catalyst',        12],
                ['investment',     'Investment',      12],
                ['valuation',      'Valuation',        8],
              ] as [string, string, number][]).map(([key, label, defMax]) => {
                const c = comps[key];
                if (!c) return null;
                const pts = c.points;
                const max = c.max_points ?? defMax;
                const raw = c.raw_score;
                if (pts == null) return null;
                const subLabel = c.label ?? c.quality_label ?? (c.pillar_count != null ? `${c.pillar_count}/3 pillars` : null);
                return (
                  <div key={key}>
                    <PR k={label} pts={pts} max={max} raw={raw} />
                    {subLabel && <div style={{ fontSize: 6, color: CC.dim, fontFamily: CC.font, paddingLeft: 8, paddingBottom: 2 }}>{subLabel}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bonuses */}
          {bon && (
            <div style={sec}>
              <span style={lbl_}>Bonuses</span>
              <PR k="Social"     pts={bon.social.points}     max={15} clr={CC.purple} />
              {bon.social.sections_hit > 0 && <DR k="Social sections" v={`${bon.social.sections_hit} hit`} />}
              <div style={rr}><span style={kk}>Whale / Insider</span><span style={{ ...vv, color: CC.dim }}>not wired yet</span></div>
              <PR k="Bottleneck" pts={bon.bottleneck.points} max={5}  clr={CC.orange} />
              {bon.bottleneck.anchor_count > 0 && <DR k="Bottleneck anchors" v={`${bon.bottleneck.anchor_count}`} />}
            </div>
          )}

          {/* Technical */}
          {tech && (
            <div style={sec}>
              <span style={lbl_}>Technical</span>
              <DR k="Stage"          v={tech.stage_label?.replace(/_/g, ' ')}           clr={CC.teal} />
              <DR k="Stage Score"    v={tech.stage_score != null ? `${Math.round(tech.stage_score)}` : null} />
              <DR k="Setup"          v={tech.technical_setup_label}                      clr={CC.teal} />
              <DR k="Entry State"    v={(tech.entry_state_display ?? tech.entry_state)?.replace(/_/g, ' ')} />
              <DR k="Entry Score"    v={tech.entry_score != null ? `${Math.round(tech.entry_score)}` : null} />
              <DR k="Extension"      v={tech.extension_state?.replace(/_/g, ' ')} clr={tech.extension_state?.includes('EXTREME') || tech.extension_state?.includes('CHASE') ? CC.red : tech.extension_state?.includes('MODERATE') ? CC.amber : CC.dim} />
              <DR k="Nearest Fib"    v={tech.nearest_fib_label} />
              <DR k="Distance Fib"   v={tech.distance_to_fib_pct != null ? `${Number(tech.distance_to_fib_pct).toFixed(1)}%` : null} />
              {tech.fib_wave_status && (
                <DR k="Fib/Wave Status" v={tech.fib_wave_status === 'pending_10y_backfill' ? 'Pending 10Y backfill' : tech.fib_wave_status.replace(/_/g, ' ')}
                   clr={tech.fib_wave_status === 'pending_10y_backfill' ? CC.amber : CC.dim} />
              )}
              <DR k="Wave Structure" v={tech.wave_structure?.replace(/_/g, ' ')} />
              <DR k="Wave Score"     v={tech.wave_score != null ? `${Math.round(tech.wave_score)}` : null} />
            </div>
          )}

          {/* Options & Catalyst details from row */}
          {(row.options_status || row.options_snapshot_status) && (
            <div style={sec}>
              <span style={lbl_}>Options Coverage</span>
              <DR k="Status"            v={row.options_status ?? row.options_snapshot_status} />
              <DR k="Classification"    v={row.options_symbol_classification} />
              <DR k="Queue Status"      v={row.options_scanner_queue_status} />
              <DR k="Backfill Priority" v={row.options_backfill_priority} />
            </div>
          )}
          {(row.direct_catalyst_present != null || row.catalyst_status) && (
            <div style={sec}>
              <span style={lbl_}>Catalyst</span>
              <DR k="Status"          v={row.catalyst_status} />
              <DR k="Direct Catalyst" v={row.direct_catalyst_present === true ? '✓ Present' : row.direct_catalyst_present === false ? 'None' : null} clr={row.direct_catalyst_present ? CC.green : CC.dim} />
              <DR k="Type"            v={row.direct_catalyst_type} />
              <DR k="LKG Source"      v={row.catalyst_lkg_source} clr={row.catalyst_lkg_source === 'unavailable_cold_start' ? CC.amber : undefined} />
            </div>
          )}

          {/* Debug */}
          <div style={sec}>
            <button onClick={() => setShowDebug(v => !v)}
              style={{ background: 'none', border: `1px solid ${CC.border}`, borderRadius: 4, color: CC.dim, fontSize: 7, padding: '3px 8px', cursor: 'pointer', fontFamily: CC.font, letterSpacing: '0.05em' }}>
              {showDebug ? '▲ HIDE DEBUG' : '▼ DEBUG'}
            </button>
            {showDebug && (
              <div style={{ marginTop: 8 }}>
                <DR k="Alpha v42 loaded" v={alphaData?.confluence_v42 ? '✓ Yes' : alphaLoading ? 'Loading…' : '✗ Not loaded'} />
                <DR k="V4.2 Score"       v={row.caelyn_confluence_v42_score}  clr={CC.dim} />
                <DR k="Normalized Score" v={row.caelyn_confluence_normalized_score} clr={CC.dim} />
                {Array.isArray(meta?.reason_codes) && meta.reason_codes.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ ...kk, display: 'block', marginBottom: 3 }}>Reason Codes ({meta.reason_codes.length}):</span>
                    {meta.reason_codes.slice(0, 20).map((rc: string, i: number) => (
                      <div key={i} style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font, paddingLeft: 8 }}>· {rc}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Main Section ───────────────────────────────────────────────── */

const CONF_TABS = [
  { key: 'all',               label: 'All Confluence'    },
  { key: 'actionable',        label: 'Actionable'        },
  { key: 'near_actionable',   label: 'Near Actionable'   },
  { key: 'watch_reset',       label: 'Watch for Reset'   },
  { key: 'risk_conflict',     label: 'Risk / Conflicts'  },
  { key: 'investment_quality',label: 'Investment Quality' },
] as const;
type ConfTab = (typeof CONF_TABS)[number]['key'];

/* ─── Part 0 audit helper ─────────────────────────────────────────── */
function auditRows(rows: any[]): Record<string, number> {
  return {
    total:                  rows.length,
    with_ccs:               rows.filter(r => r.caelyn_confluence_score != null).length,
    with_bucket:            rows.filter(r => r.caelyn_confluence_bucket).length,
    cat_score_gt0:          rows.filter(r => Number(r.catalyst_alignment_score ?? r.catalyst?.alignment_score ?? r.catalyst?.score ?? 0) > 0).length,
    cat_primary_event:      rows.filter(r => !!r.catalyst_primary_event).length,
    cat_rss_event:          rows.filter(r => !!r.catalyst_rss_event).length,
    cat_scheduled_event:    rows.filter(r => !!r.catalyst_scheduled_event).length,
    theme_policy_boost_gt0: rows.filter(r => Number(r.theme_policy_boost ?? 0) > 0).length,
    theme_policy_event:     rows.filter(r => !!r.theme_policy_event).length,
    cat_bearish_conflict:   rows.filter(r => !!r.catalyst_bearish_conflict || !!r.catalyst?.bearish_conflict).length,
    confluence_at_support:  rows.filter(r => r.confluence_at_support_state).length,
    entry_risk_reward_state:rows.filter(r => r.entry_risk_reward_state).length,
    bucket_WATCH_FOR_RESET: rows.filter(r => r.caelyn_confluence_bucket === 'WATCH_FOR_RESET').length,
    bucket_RISK_CONFLICT:   rows.filter(r => r.caelyn_confluence_bucket === 'RISK_CONFLICT').length,
    bucket_ACTIONABLE:      rows.filter(r => r.caelyn_confluence_bucket === 'ACTIONABLE').length,
    bucket_NEAR_ACTIONABLE: rows.filter(r => r.caelyn_confluence_bucket === 'NEAR_ACTIONABLE').length,
    bucket_AT_SUPPORT:      rows.filter(r => r.caelyn_confluence_bucket === 'CONFLUENCE_AT_SUPPORT').length,
  };
}

export function CaelynConfluenceSection({
  rows,
  onTickerClick,
  totalTickers,
  usingAlignmentEndpoint,
  embedded = false,
}: {
  rows: any[];
  onTickerClick?: (t: string) => void;
  totalTickers?: number;
  usingAlignmentEndpoint?: boolean;
  embedded?: boolean;
}) {
  const [tab, setTab]   = useState<ConfTab>('all');
  const [open, setOpen] = useState(true);

  /* Filter out pending rows (no analysis data yet) */
  const analyzedRows = useMemo(() => rows.filter(r => !r._pending), [rows]);

  const coverageLabel = useMemo(() => {
    const analyzed = analyzedRows.length;
    const total    = totalTickers != null ? totalTickers : rows.length;
    if (total === 0) return '';
    return `${analyzed} / ${total} scored`;
  }, [analyzedRows.length, rows.length, totalTickers]);

  /* Part 0 — audit logging: fires once per distinct analyzedRows length */
  useEffect(() => {
    if (analyzedRows.length === 0) return;
    const audit = auditRows(analyzedRows);
    console.group('[CaelynConfluence] Part 0 — Data Source Audit');
    console.log('DATA SOURCE:', usingAlignmentEndpoint ? '✅ /api/watchlist/:wid/alignment (true confluence rows)' : '⚠️  csvMergedScreenerRows FALLBACK (may lack confluence fields)');
    console.log('Row count:', audit.total, '| totalTickers prop:', totalTickers);
    console.log('with caelyn_confluence_score:', audit.with_ccs);
    console.log('with caelyn_confluence_bucket:', audit.with_bucket);
    console.log('cat_score > 0:', audit.cat_score_gt0, '| cat_primary_event:', audit.cat_primary_event, '| cat_rss_event:', audit.cat_rss_event, '| cat_scheduled_event:', audit.cat_scheduled_event);
    console.log('theme_policy_boost > 0:', audit.theme_policy_boost_gt0, '| theme_policy_event:', audit.theme_policy_event, '| bearish_conflict:', audit.cat_bearish_conflict);
    console.log('confluence_at_support:', audit.confluence_at_support, '| entry_risk_reward_state:', audit.entry_risk_reward_state);
    console.log('Buckets → ACTIONABLE:', audit.bucket_ACTIONABLE, '| NEAR_ACTIONABLE:', audit.bucket_NEAR_ACTIONABLE, '| AT_SUPPORT:', audit.bucket_AT_SUPPORT, '| WATCH_FOR_RESET:', audit.bucket_WATCH_FOR_RESET, '| RISK_CONFLICT:', audit.bucket_RISK_CONFLICT);
    /* Validation symbols */
    const CHECK_TICKERS = ['GLW','VRT','AME','TSM','BE','NVEC','MARA','CRWD','FTNT','AMD','MU','MRVL','PLTR','OKLO','SOFI','NVDA'];
    const valRows = analyzedRows.filter(r => CHECK_TICKERS.includes((r.ticker ?? r.symbol ?? '').toUpperCase()));
    if (valRows.length > 0) {
      console.group('Validation symbols:');
      for (const r of valRows) {
        const sym = (r.ticker ?? r.symbol ?? '').toUpperCase();
        console.log(sym, '| CCS:', r.caelyn_confluence_score, '| bucket:', r.caelyn_confluence_bucket, '| errState:', r.entry_risk_reward_state, '| inv:', r.investment_alignment_score, '| cat:', r.catalyst_alignment_score, '| policy_boost:', r.theme_policy_boost);
      }
      console.groupEnd();
    }
    console.groupEnd();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzedRows.length]);

  if (!rows.length) return null;
  return (
    <div style={embedded
      ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: CC.surface, overflow: 'hidden' }
      : { margin: '20px 20px 8px', background: CC.surface, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, overflow: 'hidden' }}>
      {!embedded && (
        <div
          style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: open ? `1px solid rgba(255,255,255,0.07)` : 'none' }}
          onClick={() => setOpen(v => !v)}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#fff', fontFamily: CC.font }}>CONFLUENCE</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {coverageLabel && (
              <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font, opacity: 0.7 }}>{coverageLabel}</span>
            )}
            <span style={{ color: CC.dim, fontSize: 9, fontFamily: CC.font }}>{open ? '▲' : '▼'}</span>
          </div>
        </div>
      )}
      {(embedded || open) && (
        <>
          <div style={{ display: 'flex', borderBottom: `1px solid rgba(255,255,255,0.07)`, overflowX: 'auto' as const }}>
            {CONF_TABS.map(t => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    fontSize: 8, fontWeight: active ? 700 : 500, letterSpacing: '0.04em',
                    padding: '5px 11px', cursor: 'pointer',
                    background: 'transparent', border: 'none',
                    borderBottom: active ? `2px solid ${CC.teal}` : '2px solid transparent',
                    color: active ? CC.teal : 'rgba(169,170,166,0.65)',
                    fontFamily: CC.font, whiteSpace: 'nowrap' as const, transition: 'color 0.10s',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
            {embedded && coverageLabel && (
              <span style={{ marginLeft: 'auto', padding: '0 11px', alignSelf: 'center', whiteSpace: 'nowrap' as const, fontSize: 7, color: CC.dim, fontFamily: CC.font, opacity: 0.7 }}>
                {coverageLabel}
              </span>
            )}
          </div>
          <div style={embedded
            ? { padding: '8px 10px', flex: 1, minHeight: 0, overflowY: 'auto' as const, overflowX: 'auto' as const }
            : { padding: '8px 10px', maxHeight: 560, overflowY: 'auto' as const, overflowX: 'auto' as const }}>
            {tab === 'all'               && <V42ScreenerTable rows={analyzedRows}                                                    onTickerClick={onTickerClick} />}
            {tab === 'actionable'        && <V42ScreenerTable rows={analyzedRows.filter((r: any) => (r.confluence_v42?.booleans?.is_actionable_setup   ?? r.is_actionable_setup)   === true)} onTickerClick={onTickerClick} emptyMsg="No rows with is_actionable_setup = true." />}
            {tab === 'near_actionable'   && <V42ScreenerTable rows={analyzedRows.filter((r: any) => (r.confluence_v42?.booleans?.is_near_actionable    ?? r.is_near_actionable)    === true)} onTickerClick={onTickerClick} emptyMsg="No rows with is_near_actionable = true." />}
            {tab === 'watch_reset'       && <V42ScreenerTable rows={analyzedRows.filter((r: any) => (r.confluence_v42?.booleans?.is_watch_for_reset     ?? r.is_watch_for_reset)     === true)} onTickerClick={onTickerClick} emptyMsg="No rows with is_watch_for_reset = true." />}
            {tab === 'risk_conflict'     && <V42ScreenerTable rows={analyzedRows.filter((r: any) => (r.confluence_v42?.booleans?.is_risk_conflict        ?? r.is_risk_conflict)        === true)} onTickerClick={onTickerClick} emptyMsg="No rows with is_risk_conflict = true." />}
            {tab === 'investment_quality'&& <V42ScreenerTable rows={analyzedRows.filter((r: any) => (r.confluence_v42?.booleans?.is_investment_quality   ?? r.is_investment_quality)   === true)} onTickerClick={onTickerClick} emptyMsg="No rows with is_investment_quality = true." />}
          </div>
        </>
      )}
    </div>
  );
}
