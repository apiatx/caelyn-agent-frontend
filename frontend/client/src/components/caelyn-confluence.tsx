import { useState, useMemo } from 'react';

/* ── Color palette matches watchlist.tsx ───────────────────────────── */
const CC = {
  bg: '#020202', surface: '#0a0a0a', card: '#111114',
  border: 'rgba(255,255,255,0.10)', text: '#f5f5f0', dim: '#a9aaa6',
  teal: '#0ea5e9', green: '#22c55e', red: '#ef4444',
  amber: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
  orange: '#fb923c',
  font: "'JetBrains Mono','Fira Code',monospace",
};

/* ─── Nested-safe field readers ────────────────────────────────────── */

function stageMeta(row: any) {
  const s = row?.stage2_breakout ?? row?.stage_analysis ?? {};
  return { score: (s.score ?? 0) as number, label: (s.label ?? '') as string, tm: (s.technical_metrics ?? {}) as Record<string, any> };
}

/** Investment score — tries both flat and nested paths */
function getInvScore(row: any): number | null {
  const v = row.investment_alignment_score ?? row.investment_alignment?.score ?? null;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

/** Trade score — prefers backend trade_alignment_score, falls back to derived */
function getTradeScore(row: any): number {
  const be = row.trade_alignment_score ?? row.actionability?.trade_score ?? null;
  if (be != null && Number.isFinite(Number(be))) return Math.round(Number(be));
  return deriveTrade(row);
}

/** Get investment unavailable reason with human label */
function getInvUnavailableReason(row: any): string {
  const reason = row.investment_alignment?.unavailable_reason ?? row.investment_unavailable_reason ?? null;
  const map: Record<string, string> = {
    fundamentals_missing: 'fundamentals missing',
    insufficient_data: 'insufficient data',
    not_in_investment_universe: 'not in investment universe',
    cache_missing: 'cache missing',
    unknown: 'unknown reason',
  };
  if (reason) return map[reason] ?? reason;
  return 'reason not provided';
}

/** Catalyst info — reads flat and nested catalyst object paths */
interface CatInfo {
  event: any;
  eventTitle: string;
  source: string | null;
  score: number | null;
  bearish: any;
  pBoost: number | null;
  published: string | null;
  state: string | null;
  eventType: string | null;
}

function getCatalystInfo(row: any): CatInfo | null {
  const event =
    row.catalyst_primary_event ||
    row.catalyst_rss_event ||
    row.catalyst_scheduled_event ||
    row.catalyst_v2_primary_event ||
    row.catalyst?.primary_event ||
    row.catalyst?.rss_event ||
    row.catalyst?.scheduled_event ||
    row.catalyst?.v2_primary_event ||
    null;
  if (!event) return null;

  const score =
    row.catalyst_alignment_score ?? row.catalyst?.alignment_score ??
    row.catalyst_v2_score ?? row.catalyst?.score ?? null;

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

/** Theme policy info — reads flat and nested catalyst paths */
interface PolicyInfo { available: boolean; boost: number; theme: string | null; event: string | null; score: number | null; reasonCodes: string[] }

function getThemePolicyInfo(row: any): PolicyInfo {
  const flat = row.theme_policy_available === true || (row.theme_policy_boost && Number(row.theme_policy_boost) > 0);
  const nested = row.catalyst?.theme_policy_boost && Number(row.catalyst.theme_policy_boost) > 0;

  if (flat || nested) {
    const boost = Number(row.theme_policy_boost ?? row.catalyst?.theme_policy_boost ?? 0);
    return {
      available: true,
      boost,
      theme: row.theme_policy_theme ?? row.catalyst?.theme_policy_theme ?? null,
      event: row.theme_policy_event ?? row.catalyst?.theme_policy_event ?? null,
      score: row.theme_policy_score != null ? Number(row.theme_policy_score)
        : row.catalyst?.theme_policy_score != null ? Number(row.catalyst.theme_policy_score) : null,
      reasonCodes: row.theme_policy_reason_codes ?? row.catalyst?.theme_policy_reason_codes ?? [],
    };
  }
  return { available: false, boost: 0, theme: null, event: null, score: null, reasonCodes: [] };
}

/** Options info — reads nested options object and actionability overrides */
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

/** Format an options signal slug into display text — NEVER used as main setup label */
function fmtOptionsSig(sig: string): string {
  const map: Record<string, string> = {
    asymmetric_rr: 'Asymmetric RR',
    bullish_flow: 'Bullish flow',
    bearish_flow: 'Bearish flow',
    neutral: 'Neutral',
    protective_puts: 'Protective puts',
    call_spread: 'Call spread',
    put_spread: 'Put spread',
    unusual_calls: 'Unusual calls',
    unusual_puts: 'Unusual puts',
  };
  return map[sig] ?? sig.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

/* ─── Entry state — backend-first, new states, then derived ────────── */

/** Display-friendly entry state string.
 *  Priority: backend entry_state → derive from technical_metrics */
function deriveEntryState(row: any): string {
  const beState: string = (row.entry_state ?? row.actionability?.entry_state ?? '').toUpperCase();
  const beMap: Record<string, string> = {
    SUPPORT_TEST:         'Testing support',
    LOWER_HIGH_WARNING:   'Lower-high warning',
    LOWER_LOW_CONFIRMED:  'Confirmed lower low',
    SUPPORT_LOST:         'Support lost',
    FAILED_BREAKOUT:      'Failed breakout',
    BREAKOUT_BUY_ZONE:    'Breakout — buy zone',
    POTENTIAL_BREAKOUT:   'Wait for breakout',
    COILING:              'Coiling',
    BUY_ZONE:             'Buy zone',
    WAIT_ZONE:            'Wait zone',
    EXTREME_EXTENSION:    'Extreme extension',
    EXTENDED:             'Extended',
    NEUTRAL:              'Neutral',
    HEALTHY:              'Healthy',
    PULLBACK_BUY_ZONE:    'Pullback buy zone',
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

/** Raw backend entry_state key (for severity checks) */
function rawEntryState(row: any): string {
  return (row.entry_state ?? row.actionability?.entry_state ?? '').toUpperCase();
}

/* ─── Actionability ─────────────────────────────────────────────────── */

export type ActionabilityState =
  | 'READY' | 'WATCH' | 'WAIT_FOR_BREAKOUT' | 'WAIT_FOR_RETEST'
  | 'EARLY_WATCH' | 'SUPPORT_LOST' | 'TOO_EXTENDED' | 'UNKNOWN';

export function deriveActionability(row: any): ActionabilityState {
  const es = rawEntryState(row);

  /* Hard blocks — must be SUPPORT_LOST regardless of other signals */
  if (es === 'LOWER_LOW_CONFIRMED' || es === 'SUPPORT_LOST' || es === 'FAILED_BREAKOUT') return 'SUPPORT_LOST';

  /* Support test / lower-high warning → WATCH (not SUPPORT_LOST) */
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
  if (bs === 'failed_breakout') return 'SUPPORT_LOST';

  /* READY: S2 Breakout with constructive zone, no options conflict */
  if (label.startsWith('S2 Breakout') && (ez === 'buy_zone' || timing >= 70) && !optConflict) return 'READY';
  /* Options conflict in S2 Breakout → WATCH, not READY */
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

/* ─── Derived trade score (fallback) ───────────────────────────────── */

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

/* ─── Risk severity score ───────────────────────────────────────────── */

function riskSeverity(r: any): number {
  let sev = 0;
  const action  = deriveActionability(r);
  const es      = rawEntryState(r);
  const inv     = getInvScore(r);
  const trade   = getTradeScore(r);
  const cat     = getCatalystInfo(r);
  const catScore = cat?.score ?? 0;
  const { tm }  = stageMeta(r);
  const extRaw  = (r.extension_state ?? tm.extension_risk ?? '').toLowerCase().replace(/\s+/g, '_');
  const hasBearish  = !!(cat?.bearish);
  const optConflict = r.actionability?.options_entry_conflict === true;

  if (hasBearish) sev += 100;
  if (action === 'TOO_EXTENDED') sev += 90;
  if (['LOWER_LOW_CONFIRMED', 'SUPPORT_LOST', 'FAILED_BREAKOUT'].includes(es)) sev += 85;
  if (['extreme_extension', 'vertical', 'crowded_move'].includes(extRaw)) sev += 80;
  if (optConflict) sev += 75;
  if (es === 'LOWER_HIGH_WARNING') sev += 65;
  if (inv !== null && inv < 40 && trade > 65) sev += 60;
  if (catScore > 60 && ['SUPPORT_LOST', 'FAILED_BREAKOUT', 'LOWER_LOW_CONFIRMED'].includes(es)) sev += 60;
  if (inv !== null && inv >= 65 && action === 'SUPPORT_LOST') sev += 50;
  if (es === 'SUPPORT_TEST') sev += 45;
  return sev;
}

/* ─── Why/Why Not Now ───────────────────────────────────────────────── */

function deriveWhy(row: any, action: ActionabilityState, tradeScore: number): string {
  /* Use backend setup_summary if available */
  const setupSummary = row.actionability?.setup_summary ?? null;
  if (setupSummary && typeof setupSummary === 'string') return setupSummary;

  const { label } = stageMeta(row);
  const inv      = getInvScore(row);
  const cat      = getCatalystInfo(row);
  const es       = rawEntryState(row);
  const policy   = getThemePolicyInfo(row);
  const opts     = getOptionsInfo(row);

  if (action === 'READY' && !opts.entryConflict)
    return `Actionable now — ${label} stage with constructive entry and ${tradeScore >= 75 ? 'high' : 'moderate'} trade signal (${tradeScore}).`;
  if (action === 'TOO_EXTENDED')
    return 'Extended beyond normal range — waiting for pullback or base formation reduces entry risk.';
  if (action === 'SUPPORT_LOST' && es === 'FAILED_BREAKOUT')
    return 'Failed breakout — structure broken. Needs to reclaim level and rebuild base before re-entry.';
  if (action === 'SUPPORT_LOST')
    return 'Support lost or confirmed lower low — prior structure broken. Wait for base rebuild.';
  if (es === 'SUPPORT_TEST')
    return 'Testing a key support level — holding here is bullish, breaking it resets the thesis.';
  if (es === 'LOWER_HIGH_WARNING')
    return 'Lower-high forming — momentum is slowing. Needs to take out prior high to remain constructive.';
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

/* ─── Formatters ─────────────────────────────────────────────────────── */

function fmtTicker(row: any): string { return (row.ticker || row.symbol || '').toString().toUpperCase(); }
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
    rss_v2: 'RSS', scheduled: 'Scheduled', calendar: 'Scheduled',
    combined: 'Combined', theme_policy: 'Theme Policy',
    rss_v2_plus_theme_policy: 'RSS + Theme Policy',
    scheduled_plus_theme_policy: 'Scheduled + Theme Policy',
  };
  return map[src] ?? src;
}

/* ─── Visual atoms ──────────────────────────────────────────────────── */

function ActionabilityBadge({ action }: { action: ActionabilityState }) {
  type Cfg = { label: string; clr: string; bg: string };
  const cfg: Record<ActionabilityState, Cfg> = {
    READY:             { label: 'READY',           clr: CC.green,  bg: `${CC.green}22`  },
    WATCH:             { label: 'WATCH',           clr: CC.teal,   bg: `${CC.teal}1a`   },
    WAIT_FOR_BREAKOUT: { label: 'WAIT · BREAKOUT', clr: CC.amber,  bg: `${CC.amber}1a`  },
    WAIT_FOR_RETEST:   { label: 'WAIT · RETEST',   clr: CC.amber,  bg: `${CC.amber}1a`  },
    EARLY_WATCH:       { label: 'EARLY WATCH',     clr: CC.blue,   bg: `${CC.blue}1a`   },
    SUPPORT_LOST:      { label: 'SUPPORT LOST',    clr: CC.red,    bg: `${CC.red}1a`    },
    TOO_EXTENDED:      { label: 'TOO EXTENDED',    clr: CC.orange, bg: 'rgba(251,146,60,0.16)' },
    UNKNOWN:           { label: 'UNKNOWN',         clr: CC.dim,    bg: 'transparent'    },
  };
  const c = cfg[action] ?? cfg.UNKNOWN;
  return (
    <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 3, background: c.bg, color: c.clr, fontFamily: CC.font, whiteSpace: 'nowrap' as const }}>
      {c.label}
    </span>
  );
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

function EntryStatePill({ label }: { label: string }) {
  const lc = label.toLowerCase();
  const clr = lc.includes('confirmed') || lc.includes('support lost') || lc.includes('failed') ? CC.red
    : lc.includes('warning') || lc.includes('testing') ? CC.amber
    : lc.includes('buy zone') || lc.includes('breakout') ? CC.green
    : CC.dim;
  return <span style={{ fontSize: 8, color: clr, fontFamily: CC.font, fontWeight: 600 }}>{label}</span>;
}

/* ─── Conf Card ─────────────────────────────────────────────────────── */

function ConfCard({ row }: { row: any }) {
  const ticker  = fmtTicker(row);
  const company = fmtCompany(row);
  const action  = deriveActionability(row);
  const trade   = getTradeScore(row);
  const entry   = deriveEntryState(row);
  const theme   = row.canonical_theme_name || row.theme || null;
  const { label: stageLabel } = stageMeta(row);
  const inv     = getInvScore(row);
  const invReason = inv === null ? getInvUnavailableReason(row) : null;
  const cat     = getCatalystInfo(row);
  const policy  = getThemePolicyInfo(row);
  const opts    = getOptionsInfo(row);
  const why     = deriveWhy(row, action, trade);

  const dimTxt  = { fontSize: 8, color: CC.dim, fontFamily: CC.font, lineHeight: 1.4 } as const;
  const boldTxt = { ...dimTxt, color: CC.text, fontWeight: 600 } as const;

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
              <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, maxWidth: 80, textAlign: 'center' as const, lineHeight: 1.3 }}>{invReason}</span>
            </span>
        }
        {opts.alignScore !== null && <ScoreChip label="Options" value={Math.round(opts.alignScore)} color={scoreColor(opts.alignScore)} />}
        {cat?.score != null && <ScoreChip label="Catalyst" value={Math.round(cat.score)} color={scoreColor(cat.score)} />}
      </div>

      {/* Entry + Stage */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <span style={dimTxt}>Entry: <EntryStatePill label={entry} /></span>
        {stageLabel && <span style={dimTxt}>Stage: <span style={{ ...boldTxt, color: CC.teal }}>{stageLabel}</span></span>}
      </div>

      {/* Options signal (isolated — never used as main label) */}
      {opts.sigLabel && (
        <span style={{ ...dimTxt, color: CC.purple }}>
          Options: {opts.sigLabel}{opts.entryConflict ? ' · entry conflict' : ''}
        </span>
      )}

      {/* Catalyst / Policy / Theme / Conflict */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
        {cat?.event
          ? <span style={{ ...dimTxt, color: CC.amber }}>● {cat.eventTitle}</span>
          : <span style={dimTxt}>Catalyst: None</span>
        }
        {policy.available && (
          <span style={{ ...dimTxt, color: CC.purple }}>
            Policy: {policy.theme} +{policy.boost}{policy.event ? ` · ${policy.event}` : ''}
          </span>
        )}
        {theme && <span style={dimTxt}>Theme: <span style={{ color: 'rgba(255,255,255,0.45)' }}>{theme}</span></span>}
        {cat?.bearish && <span style={{ ...dimTxt, color: CC.red }}>⚠ {fmtCatalystEvent(cat.bearish)}</span>}
      </div>

      {/* Why */}
      <div style={{ paddingTop: 6, borderTop: `1px solid ${CC.border}`, ...dimTxt }}>{why}</div>
    </div>
  );
}

/* ─── Layout helpers ────────────────────────────────────────────────── */

function CardGrid({ rows }: { rows: any[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
      {rows.map((r, i) => <ConfCard key={`cc-${fmtTicker(r)}-${i}`} row={r} />)}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '20px 0', textAlign: 'center' as const, fontSize: 9, color: CC.dim, fontFamily: CC.font, lineHeight: 1.6 }}>{msg}</div>
  );
}

/* ─── Tab: Actionable Setups ────────────────────────────────────────── */

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

/* ─── Tab: Investment Quality ───────────────────────────────────────── */

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
          Investment Alignment score not yet available in this watchlist. Rows ranked by Trade signal as proxy.
        </div>
      )}
      <CardGrid rows={sorted} />
    </>
  );
}

/* ─── Tab: Theme Policy Tailwinds ───────────────────────────────────── */

function TabThemePolicy({ rows }: { rows: any[] }) {
  const policyRows = useMemo(
    () => rows.filter(r => getThemePolicyInfo(r).available),
    [rows],
  );

  if (!policyRows.length) {
    return (
      <EmptyState msg={
        'No Theme Policy tailwinds detected in current watchlist.\n' +
        'Theme Policy appears when backend returns theme_policy_available=true, theme_policy_boost>0, ' +
        'theme_policy_event, or catalyst.theme_policy_boost>0 for at least one ticker.'
      } />
    );
  }

  const grouped = new Map<string, any[]>();
  for (const r of policyRows) {
    const pi  = getThemePolicyInfo(r);
    const key = pi.theme ?? 'Unknown';
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
            <div style={{ marginTop: 5, fontSize: 7, color: CC.dim, fontFamily: CC.font, fontStyle: 'italic' }}>
              Theme Policy is sector/macro level — not a company-specific catalyst.
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tab: New Catalysts ────────────────────────────────────────────── */

function TabCatalysts({ rows }: { rows: any[] }) {
  const catRows = useMemo(() => {
    return [...rows]
      .map(r => ({ r, cat: getCatalystInfo(r) }))
      .filter(x => {
        if (!x.cat) return false;
        /* exclude pure theme-policy-only entries with no company-specific event */
        const title = x.cat.eventTitle.toLowerCase();
        const isPurePolicy = x.cat.pBoost != null && !x.cat.source && title.length === 0;
        return !isPurePolicy;
      })
      .sort((a, b) => {
        const sa = a.cat?.score ?? 0, sb = b.cat?.score ?? 0;
        return sb - sa;
      })
      .slice(0, 20)
      .map(x => x.r);
  }, [rows]);

  if (!catRows.length) {
    return (
      <EmptyState msg={
        'No catalyst events detected in current watchlist.\n' +
        'Catalyst data appears when backend returns catalyst_primary_event, catalyst_rss_event, catalyst_scheduled_event, ' +
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

/* ─── Tab: Risk / Conflicts ─────────────────────────────────────────── */

function TabRisk({ rows }: { rows: any[] }) {
  interface RiskEntry { r: any; sev: number; risks: string[]; detail: string }

  const riskEntries = useMemo<RiskEntry[]>(() => {
    const out: RiskEntry[] = [];
    for (const r of rows) {
      const risks: string[]  = [];
      const action  = deriveActionability(r);
      const es      = rawEntryState(r);
      const trade   = getTradeScore(r);
      const inv     = getInvScore(r);
      const cat     = getCatalystInfo(r);
      const sev     = riskSeverity(r);
      const { tm }  = stageMeta(r);
      const optConflict = r.actionability?.options_entry_conflict === true;
      const opts    = getOptionsInfo(r);

      if (cat?.bearish) risks.push('Bearish catalyst conflict');
      if (action === 'TOO_EXTENDED') risks.push('Vertical / extreme extension');
      if (['LOWER_LOW_CONFIRMED', 'SUPPORT_LOST'].includes(es)) risks.push('Confirmed lower low / structure broken');
      if (es === 'FAILED_BREAKOUT') risks.push('Failed breakout');
      if (es === 'LOWER_HIGH_WARNING') risks.push('Lower-high warning');
      if (es === 'SUPPORT_TEST') risks.push('Testing support');
      if (optConflict && opts.sigLabel) risks.push(`Options asymmetric (${opts.sigLabel}), entry extended`);
      if (inv !== null && inv < 40 && trade > 65) risks.push('Hot trade / weak investment quality');

      if (!risks.length) continue;

      const detail =
        es === 'FAILED_BREAKOUT' ? 'Prior breakout failed. Wait for base rebuild and reclaim of key level before re-entry.'
        : ['LOWER_LOW_CONFIRMED', 'SUPPORT_LOST'].includes(es) ? 'Confirmed lower low — prior structure broken. Wait for re-base.'
        : es === 'SUPPORT_TEST' ? 'Holding support here is constructive; a close below triggers re-evaluation of thesis.'
        : es === 'LOWER_HIGH_WARNING' ? 'Momentum slowing — needs to clear prior high to confirm continuation.'
        : action === 'TOO_EXTENDED' ? `${tm.extension_risk ?? 'Extended'} — waiting for pullback reduces risk.`
        : cat?.bearish ? 'Bullish catalyst is offset by a bearish conflict — net signal mixed.'
        : optConflict ? `Options (${opts.sigLabel ?? 'asymmetric'}) signal is positive but entry structure conflicts — wait for reset.`
        : inv !== null && inv < 40 ? `Trade setup (${trade}) stronger than investment quality (${inv}). Speculative.`
        : 'Risk flags present — review structure and catalyst before entry.';

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
                <span style={{ fontSize: 7, color: CC.red, fontFamily: CC.font }}>Sev {sev}</span>
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

/* ─── Expandable Row Breakdown ──────────────────────────────────────── */

export function CaelynRowBreakdown({ stock }: { stock: any }) {
  const action  = deriveActionability(stock);
  const trade   = getTradeScore(stock);
  const entry   = deriveEntryState(stock);
  const why     = deriveWhy(stock, action, trade);
  const { label: stageLabel, score: stageScore, tm } = stageMeta(stock);
  const inv     = getInvScore(stock);
  const invReason = inv === null ? getInvUnavailableReason(stock) : null;
  const cat     = getCatalystInfo(stock);
  const policy  = getThemePolicyInfo(stock);
  const opts    = getOptionsInfo(stock);
  const volx    = stock.relative_volume != null ? Number(stock.relative_volume) : null;
  const volMc   = stock.vol_mc_pct != null ? Number(stock.vol_mc_pct) : null;
  const timing  = typeof tm.technical_timing_score === 'number' ? tm.technical_timing_score : null;
  const eliteRebound = !!(stock.elite_asset_rebound);

  /* Backend-direct entry fields */
  const entryScore   = stock.entry_score ?? stock.actionability?.entry_score ?? null;
  const entryGrade   = stock.entry_grade ?? stock.actionability?.entry_grade ?? null;
  const baseArchetype= stock.base_archetype ?? stock.actionability?.base_archetype ?? null;
  const extensionState = stock.extension_state ?? stock.actionability?.extension_state ?? tm.extension_risk ?? null;

  const lbl: React.CSSProperties = { fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: CC.dim, fontFamily: CC.font, marginBottom: 3 };
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 };
  const val: React.CSSProperties = { fontSize: 9, color: CC.dim, fontFamily: CC.font };
  const valBold: React.CSSProperties = { ...val, color: CC.text, fontWeight: 600 };
  const sec: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: 4 };

  return (
    <div style={{
      background: '#0d0d12',
      borderBottom: `1px solid ${CC.border}`,
      borderLeft: `2px solid ${CC.teal}55`,
      padding: '12px 18px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...rowStyle }}>
          <span style={val}>Stage</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MiniBar value={stageScore} color={CC.teal} />
            <span style={{ ...val, color: CC.text, width: 22, textAlign: 'right' as const }}>{stageScore}</span>
          </div>
        </div>
        {volx !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...rowStyle }}>
            <span style={val}>VolX</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MiniBar value={Math.min(100, volx * 20)} color={CC.amber} />
              <span style={{ ...val, color: CC.text, width: 28, textAlign: 'right' as const }}>{volx.toFixed(1)}×</span>
            </div>
          </div>
        )}
        {volMc !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...rowStyle }}>
            <span style={val}>Vol/MC</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MiniBar value={Math.min(100, volMc * 7)} color={CC.blue} />
              <span style={{ ...val, color: CC.text, width: 32, textAlign: 'right' as const }}>{volMc.toFixed(1)}%</span>
            </div>
          </div>
        )}
        {opts.alignScore !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...rowStyle }}>
            <span style={val}>Options</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MiniBar value={opts.alignScore} color={CC.purple} />
              <span style={{ ...val, color: scoreColor(opts.alignScore), fontWeight: 700, width: 22, textAlign: 'right' as const }}>{Math.round(opts.alignScore)}</span>
            </div>
          </div>
        )}
        {timing !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...rowStyle }}>
            <span style={val}>Timing</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MiniBar value={timing} color={CC.green} />
              <span style={{ ...val, color: CC.text, width: 22, textAlign: 'right' as const }}>{timing}</span>
            </div>
          </div>
        )}
      </div>

      {/* C — Investment Case */}
      <div style={sec}>
        <div style={lbl}>C — Investment Case</div>
        {inv !== null
          ? <span style={{ ...val, color: scoreColor(inv), fontSize: 13, fontWeight: 700 }}>{inv} / 100</span>
          : <span style={{ ...val, color: CC.dim }}>Investment unavailable<br />{invReason}</span>
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
        <span style={val}>
          Note: <span style={{ color: CC.dim, fontSize: 8 }}>Options signal ≠ entry quality</span>
        </span>
      </div>

      {/* E — Entry Structure */}
      <div style={sec}>
        <div style={lbl}>E — Entry Structure</div>
        <span style={val}>State: <EntryStatePill label={entry} /></span>
        {entryScore != null && <span style={val}>Score: <span style={{ color: scoreColor(Number(entryScore)) }}>{entryScore}</span></span>}
        {entryGrade && <span style={val}>Grade: <span style={valBold}>{entryGrade}</span></span>}
        {baseArchetype && <span style={val}>Base: <span style={valBold}>{baseArchetype}</span></span>}
        {extensionState && <span style={val}>Extension: <span style={{ color: String(extensionState).includes('extreme') || String(extensionState).includes('vertical') ? CC.red : String(extensionState).includes('extended') ? CC.amber : CC.text }}>{extensionState}</span></span>}
        {timing !== null && <span style={val}>Timing: <span style={{ color: scoreColor(timing) }}>{timing}</span></span>}
        {tm.breakout_signal && <span style={val}>Breakout: <span style={valBold}>{tm.breakout_signal}</span></span>}
        {tm.entry_zone && <span style={val}>Zone: <span style={valBold}>{tm.entry_zone}</span></span>}
        {tm.squeeze_signal && <span style={val}>Squeeze: <span style={valBold}>{tm.squeeze_signal}</span></span>}
      </div>

      {/* F — Catalyst & Policy */}
      <div style={sec}>
        <div style={lbl}>F — Catalyst &amp; Policy</div>
        {cat?.event
          ? <>
              <span style={{ fontSize: 9, color: CC.amber, fontFamily: CC.font, lineHeight: 1.4 }}>{cat.eventTitle}</span>
              {cat.source && <span style={val}>Source: {fmtSource(cat.source)}</span>}
              {cat.score != null && <span style={val}>Score: <span style={{ color: scoreColor(cat.score) }}>{Math.round(cat.score)}</span></span>}
              {cat.published && <span style={val}>Published: {String(cat.published).slice(0, 10)}</span>}
            </>
          : <span style={val}>Catalyst: None</span>
        }
        {policy.available
          ? <span style={{ ...val, color: CC.purple }}>
              Policy: {policy.theme} +{policy.boost}{policy.event ? ` · ${policy.event}` : ''}
            </span>
          : <span style={val}>Policy: None</span>
        }
        {cat?.pBoost != null && !policy.available && (
          <span style={{ ...val, color: CC.purple }}>Theme Policy: +{cat.pBoost}</span>
        )}
        {cat?.bearish
          ? <span style={{ ...val, color: CC.red }}>⚠ Conflict: {fmtCatalystEvent(cat.bearish)}</span>
          : <span style={val}>Conflict: None</span>
        }
        <span style={{ fontSize: 7, color: CC.dim, fontFamily: CC.font, marginTop: 2 }}>Trade ≠ Investment · Options ≠ Entry · Policy ≠ Company catalyst</span>
      </div>

      {/* G — Why / Why Not Now */}
      <div style={{ ...sec, gridColumn: 'span 2' }}>
        <div style={lbl}>G — Why / Why Not Now</div>
        <span style={{ fontSize: 9, color: CC.text, fontFamily: CC.font, lineHeight: 1.55 }}>{why}</span>
      </div>
    </div>
  );
}

/* ─── Main Section ──────────────────────────────────────────────────── */

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
      {/* Header */}
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
          {/* Tab bar */}
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

          {/* Tab body */}
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
