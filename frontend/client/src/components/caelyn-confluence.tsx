import { useState, useMemo } from 'react';

/* ── Color palette matches watchlist.tsx ───────────────────────────── */
const CC = {
  bg: '#020202', surface: '#0a0a0a', card: '#111114',
  border: 'rgba(255,255,255,0.10)', text: '#f5f5f0', dim: '#a9aaa6',
  teal: '#0ea5e9', green: '#22c55e', red: '#ef4444',
  amber: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
  font: "'JetBrains Mono','Fira Code',monospace",
};

/* ─── Data helpers ─────────────────────────────────────────────────── */

function stageMeta(row: any) {
  const s = row?.stage2_breakout ?? row?.stage_analysis ?? {};
  return { score: (s.score ?? 0) as number, label: (s.label ?? '') as string, tm: (s.technical_metrics ?? {}) as Record<string, any> };
}

export type ActionabilityState =
  | 'READY' | 'WATCH' | 'WAIT_FOR_BREAKOUT' | 'WAIT_FOR_RETEST'
  | 'EARLY_WATCH' | 'SUPPORT_LOST' | 'TOO_EXTENDED' | 'UNKNOWN';

export function deriveActionability(row: any): ActionabilityState {
  const { label, tm } = stageMeta(row);
  const ext    = (tm.extension_risk ?? '') as string;
  const bs     = (tm.breakout_signal ?? '') as string;
  const ez     = (tm.entry_zone ?? '') as string;
  const timing = typeof tm.technical_timing_score === 'number' ? tm.technical_timing_score : 50;

  if (ext === 'extreme_extension') return 'TOO_EXTENDED';
  if (ext === 'extended' && timing < 40) return 'TOO_EXTENDED';
  if (bs === 'failed_breakout') return 'SUPPORT_LOST';
  if (label.startsWith('S2 Breakout') && (ez === 'buy_zone' || timing >= 70)) return 'READY';
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

function deriveEntryState(row: any): string {
  const { tm, label } = stageMeta(row);
  const bs  = (tm.breakout_signal ?? '') as string;
  const ez  = (tm.entry_zone ?? '') as string;
  const ext = (tm.extension_risk ?? '') as string;
  if (ext === 'extreme_extension') return 'EXTREME EXTENSION';
  if (ext === 'extended') return 'EXTENDED';
  if (bs === 'failed_breakout') return 'FAILED BREAKOUT';
  if (bs === 'breakout' && ez === 'buy_zone') return 'BREAKOUT — BUY ZONE';
  if (bs === 'potential_breakout') return 'WAIT FOR BREAKOUT';
  if (bs === 'coiling') return 'COILING';
  if (ez === 'buy_zone') return 'BUY ZONE';
  if (ez === 'wait_zone') return 'WAIT ZONE';
  if (ez === 'neutral') return 'NEUTRAL';
  if (label) return label.split(' ').slice(0, 3).join(' ').toUpperCase();
  return 'UNKNOWN';
}

export function deriveTrade(row: any): number {
  const { score: stageScore, tm } = stageMeta(row);
  const timing  = typeof tm.technical_timing_score === 'number' ? tm.technical_timing_score : 50;
  const volx    = typeof row.relative_volume === 'number' ? row.relative_volume : 0;
  const volxS   = volx >= 5 ? 100 : volx >= 3 ? 88 : volx >= 2 ? 72 : volx >= 1.5 ? 58 : volx >= 1.2 ? 45 : Math.min(40, volx * 30);
  const volMc   = typeof row.vol_mc_pct === 'number' ? row.vol_mc_pct : 0;
  const volMcS  = volMc >= 15 ? 100 : volMc >= 8 ? 80 : volMc >= 4 ? 60 : volMc >= 2 ? 40 : Math.min(35, volMc * 10);
  const optScore = row.options_score != null && Number.isFinite(Number(row.options_score)) ? Number(row.options_score) : 50;
  return Math.round(timing * 0.30 + volxS * 0.25 + volMcS * 0.20 + optScore * 0.15 + stageScore * 0.10);
}

function deriveWhy(row: any, action: ActionabilityState, tradeScore: number): string {
  const { label } = stageMeta(row);
  const invScore = row.investment_alignment_score != null ? Number(row.investment_alignment_score) : null;
  const catalystEvent = row.catalyst_primary_event || row.catalyst_v2_primary_event || row.catalyst_rss_event || row.catalyst_scheduled_event;
  const hasBearish = !!(row.catalyst_bearish_conflict || (Array.isArray(row.catalyst_v2_conflicts) && row.catalyst_v2_conflicts.length > 0));
  const hasThemePolicy = !!(row.theme_policy_available && row.theme_policy_boost);

  if (action === 'READY') return `Actionable now — ${label} stage with constructive entry and ${tradeScore >= 75 ? 'high' : 'moderate'} trade signal (${tradeScore}).`;
  if (action === 'TOO_EXTENDED') return 'Extended beyond normal range — waiting for pullback or base formation reduces entry risk.';
  if (action === 'SUPPORT_LOST') return 'Structure broken — prior breakout failed. Needs to reclaim level and rebuild base before re-entry.';
  if (hasBearish && catalystEvent) return 'Bullish catalyst is offset by a bearish conflict — net signal is mixed.';
  if (invScore !== null && invScore >= 75) return 'Strong investment quality, but entry is not ready yet. Patience warranted.';
  if (catalystEvent) return 'Catalyst is active, but waiting for entry confirmation before committing.';
  if (hasThemePolicy && !catalystEvent) return 'Theme-wide policy tailwind is active; no company-specific catalyst detected.';
  if (action === 'WAIT_FOR_BREAKOUT') return `${label} — coiling or consolidating. Watching for breakout trigger with volume confirmation.`;
  if (action === 'EARLY_WATCH') return `Early stage (${label}) — building watch. Entry criteria not yet met.`;
  if (tradeScore >= 75) return `Trade signal is strong (${tradeScore}). Continue monitoring for entry confirmation.`;
  return `${label || 'Current'} stage — watching for additional signal confirmation before entry.`;
}

function fmtTicker(row: any): string {
  return (row.ticker || row.symbol || '').toString().toUpperCase();
}

function fmtCompany(row: any): string {
  return (row.company || row.name || '').toString();
}

function scoreColor(v: number): string {
  return v >= 75 ? CC.green : v >= 55 ? CC.teal : v >= 40 ? CC.amber : CC.red;
}

function fmtCatalystEvent(ev: any): string {
  if (!ev) return '';
  if (typeof ev === 'string') return ev;
  if (typeof ev === 'object' && ev.title) return String(ev.title);
  return String(ev);
}

/* ─── Visual atoms ─────────────────────────────────────────────────── */

function ActionabilityBadge({ action }: { action: ActionabilityState }) {
  type Cfg = { label: string; clr: string; bg: string };
  const cfg: Record<ActionabilityState, Cfg> = {
    READY:              { label: 'READY',           clr: CC.green,  bg: `${CC.green}22`          },
    WATCH:              { label: 'WATCH',           clr: CC.teal,   bg: `${CC.teal}1a`            },
    WAIT_FOR_BREAKOUT:  { label: 'WAIT · BREAKOUT', clr: CC.amber,  bg: `${CC.amber}1a`           },
    WAIT_FOR_RETEST:    { label: 'WAIT · RETEST',   clr: CC.amber,  bg: `${CC.amber}1a`           },
    EARLY_WATCH:        { label: 'EARLY WATCH',     clr: CC.blue,   bg: `${CC.blue}1a`            },
    SUPPORT_LOST:       { label: 'SUPPORT LOST',    clr: CC.red,    bg: `${CC.red}1a`             },
    TOO_EXTENDED:       { label: 'TOO EXTENDED',    clr: '#fb923c', bg: 'rgba(251,146,60,0.16)'   },
    UNKNOWN:            { label: 'UNKNOWN',         clr: CC.dim,    bg: 'transparent'             },
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
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{ width: 44, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  );
}

/* ─── Conf Card ────────────────────────────────────────────────────── */

function ConfCard({ row }: { row: any }) {
  const ticker  = fmtTicker(row);
  const company = fmtCompany(row);
  const action  = deriveActionability(row);
  const trade   = deriveTrade(row);
  const entry   = deriveEntryState(row);
  const theme   = row.canonical_theme_name || row.theme || null;
  const { label: stageLabel } = stageMeta(row);
  const optScore = row.options_score != null && Number.isFinite(Number(row.options_score)) ? Number(row.options_score) : null;
  const optSig   = (row.options_signal && row.options_signal !== 'NO DATA') ? (row.options_signal as string) : null;
  const invScore = row.investment_alignment_score != null ? Number(row.investment_alignment_score) : null;
  const catEvent = row.catalyst_primary_event || row.catalyst_v2_primary_event || row.catalyst_rss_event || row.catalyst_scheduled_event || null;
  const catScore = row.catalyst_alignment_score ?? row.catalyst_v2_score ?? null;
  const policyBoost = row.theme_policy_available && row.theme_policy_boost != null ? Number(row.theme_policy_boost) : null;
  const policyTheme = row.theme_policy_theme ?? null;
  const policyEvent = row.theme_policy_event ?? null;
  const bearish = row.catalyst_bearish_conflict || (Array.isArray(row.catalyst_v2_conflicts) && row.catalyst_v2_conflicts.length > 0 ? row.catalyst_v2_conflicts[0] : null) || null;
  const why = deriveWhy(row, action, trade);

  const dimTxt = { fontSize: 8, color: CC.dim, fontFamily: CC.font, lineHeight: 1.4 } as const;
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

      {/* Scores row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
        <ScoreChip label="Trade" value={trade} color={scoreColor(trade)} />
        {invScore !== null
          ? <ScoreChip label="Investment" value={invScore} color={scoreColor(invScore)} />
          : <span style={{ display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: 6, color: CC.dim, letterSpacing: '0.07em', textTransform: 'uppercase' as const, fontFamily: CC.font }}>Investment</span>
              <span style={{ fontSize: 9, color: CC.dim, fontFamily: CC.font }}>unavail.</span>
            </span>
        }
        {optScore !== null && <ScoreChip label="Options" value={Math.round(optScore)} color={scoreColor(optScore)} />}
        {catScore != null && <ScoreChip label="Catalyst" value={Math.round(Number(catScore))} color={scoreColor(Number(catScore))} />}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <span style={dimTxt}>Entry: <span style={boldTxt}>{entry}</span></span>
        {stageLabel && <span style={dimTxt}>Stage: <span style={{ ...boldTxt, color: CC.teal }}>{stageLabel}</span></span>}
      </div>

      {/* Catalyst / Policy / Options / Theme */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
        {catEvent
          ? <span style={{ ...dimTxt, color: CC.amber }}>● {fmtCatalystEvent(catEvent)}</span>
          : <span style={dimTxt}>Catalyst: None</span>
        }
        {policyBoost !== null && (
          <span style={{ ...dimTxt, color: CC.purple }}>Policy: {policyTheme} +{policyBoost}{policyEvent ? ` · ${policyEvent}` : ''}</span>
        )}
        {optSig && <span style={{ ...dimTxt, color: CC.teal }}>Options: {optSig}</span>}
        {theme && <span style={dimTxt}>Theme: <span style={{ color: 'rgba(255,255,255,0.45)' }}>{theme}</span></span>}
        {bearish && <span style={{ ...dimTxt, color: CC.red }}>⚠ Conflict: {fmtCatalystEvent(bearish)}</span>}
      </div>

      {/* Why */}
      <div style={{ paddingTop: 6, borderTop: `1px solid ${CC.border}`, ...dimTxt }}>{why}</div>
    </div>
  );
}

/* ─── Layout helpers ───────────────────────────────────────────────── */

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

/* ─── Tab content ──────────────────────────────────────────────────── */

function TabActionableSetups({ rows }: { rows: any[] }) {
  const sorted = useMemo(() => {
    return [...rows]
      .map(r => ({ r, action: deriveActionability(r), trade: deriveTrade(r) }))
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

function TabInvestmentQuality({ rows }: { rows: any[] }) {
  const sorted = useMemo(() => {
    return [...rows]
      .sort((a, b) => {
        const ia = a.investment_alignment_score != null ? Number(a.investment_alignment_score) : null;
        const ib = b.investment_alignment_score != null ? Number(b.investment_alignment_score) : null;
        if (ia !== null && ib !== null) return ib - ia;
        if (ia !== null) return -1;
        if (ib !== null) return 1;
        return deriveTrade(b) - deriveTrade(a);
      })
      .slice(0, 12);
  }, [rows]);

  const allUnavailable = rows.every(r => r.investment_alignment_score == null);

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

function TabThemePolicy({ rows }: { rows: any[] }) {
  const policyRows = useMemo(
    () => rows.filter(r => r.theme_policy_available || (r.theme_policy_boost && Number(r.theme_policy_boost) > 0)),
    [rows],
  );

  if (!policyRows.length) {
    return <EmptyState msg="No Theme Policy tailwinds detected in current watchlist.&#10;Theme Policy appears when the backend returns theme_policy_available = true or theme_policy_boost > 0 for at least one ticker." />;
  }

  const grouped = new Map<string, any[]>();
  for (const r of policyRows) {
    const key = (r.theme_policy_theme ?? 'Unknown') as string;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
      {Array.from(grouped.entries()).map(([theme, trows]) => {
        const boost = trows[0]?.theme_policy_boost ?? null;
        const event = trows[0]?.theme_policy_event ?? null;
        const score = trows[0]?.theme_policy_score ?? null;
        const codes: string[] = trows[0]?.theme_policy_reason_codes ?? [];
        return (
          <div key={theme} style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: CC.purple, fontFamily: CC.font }}>{theme}{boost != null ? ` +${boost}` : ''}</div>
            {event && <div style={{ fontSize: 9, color: CC.text, fontFamily: CC.font, marginTop: 3, lineHeight: 1.4 }}>{String(event)}</div>}
            {score != null && <div style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, marginTop: 2 }}>Policy score: {Math.round(Number(score))}</div>}
            {codes.length > 0 && <div style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, marginTop: 2 }}>Codes: {codes.join(' · ')}</div>}
            <div style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font, marginTop: 5 }}>
              Affected ({trows.length}): {trows.slice(0, 10).map(fmtTicker).join(', ')}
            </div>
            <div style={{ marginTop: 5, fontSize: 7, color: CC.dim, fontFamily: CC.font, fontStyle: 'italic' }}>
              Theme Policy Tailwind is theme-level — it signals a sector/macro catalyst, not a company-specific event.
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtSource(src: string | null | undefined): string {
  const map: Record<string, string> = {
    rss_v2: 'RSS', scheduled: 'Scheduled', calendar: 'Scheduled',
    combined: 'Combined', theme_policy: 'Theme Policy',
    rss_v2_plus_theme_policy: 'RSS + Theme Policy',
    scheduled_plus_theme_policy: 'Scheduled + Theme Policy',
  };
  if (!src || src === 'none') return 'None';
  return map[src] ?? src;
}

function TabCatalysts({ rows }: { rows: any[] }) {
  const catRows = useMemo(() => {
    return [...rows]
      .filter(r => r.catalyst_primary_event || r.catalyst_rss_event || r.catalyst_scheduled_event || r.catalyst_v2_primary_event)
      .sort((a, b) => {
        const sa = Number(a.catalyst_alignment_score ?? a.catalyst_v2_score ?? 0);
        const sb = Number(b.catalyst_alignment_score ?? b.catalyst_v2_score ?? 0);
        return sb - sa;
      })
      .slice(0, 12);
  }, [rows]);

  if (!catRows.length) {
    return <EmptyState msg="No catalyst events detected in current watchlist.&#10;Catalyst data appears when the backend returns catalyst_primary_event, catalyst_rss_event, or catalyst_scheduled_event for at least one ticker." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      {catRows.map((r, i) => {
        const ticker  = fmtTicker(r);
        const event   = r.catalyst_primary_event || r.catalyst_v2_primary_event || r.catalyst_rss_event || r.catalyst_scheduled_event;
        const source  = r.catalyst_primary_source ?? r.catalyst_v2_state ?? null;
        const score   = r.catalyst_alignment_score ?? r.catalyst_v2_score ?? null;
        const bearish = r.catalyst_bearish_conflict;
        const pBoost  = r.theme_policy_boost != null ? Number(r.theme_policy_boost) : null;
        const published = r.catalyst_rss_published ?? r.catalyst_published ?? null;

        return (
          <div key={`cat-${ticker}-${i}`} style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: CC.font }}>{ticker}</span>
              {score != null && <span style={{ fontSize: 9, color: scoreColor(Number(score)), fontWeight: 700, fontFamily: CC.font }}>Score {Math.round(Number(score))}</span>}
            </div>
            <span style={{ fontSize: 8, color: CC.amber, fontFamily: CC.font, lineHeight: 1.4 }}>● {fmtCatalystEvent(event)}</span>
            {source && <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Source: {fmtSource(source)}</span>}
            {published && <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Published: {String(published).slice(0, 10)}</span>}
            {pBoost !== null && <span style={{ fontSize: 8, color: CC.purple, fontFamily: CC.font }}>Policy: +{pBoost}</span>}
            {bearish && <span style={{ fontSize: 8, color: CC.red, fontFamily: CC.font }}>⚠ Conflict: {fmtCatalystEvent(bearish)}</span>}
          </div>
        );
      })}
    </div>
  );
}

function TabRisk({ rows }: { rows: any[] }) {
  interface RiskEntry { r: any; risks: string[]; detail: string }
  const riskEntries = useMemo<RiskEntry[]>(() => {
    const out: RiskEntry[] = [];
    for (const r of rows) {
      const risks: string[] = [];
      const action = deriveActionability(r);
      const entry  = deriveEntryState(r);
      const trade  = deriveTrade(r);
      const inv    = r.investment_alignment_score != null ? Number(r.investment_alignment_score) : null;
      const hasBearish = !!(r.catalyst_bearish_conflict || (Array.isArray(r.catalyst_v2_conflicts) && r.catalyst_v2_conflicts.length > 0));
      const { tm } = stageMeta(r);

      if (hasBearish) risks.push('Bearish catalyst conflict');
      if (action === 'TOO_EXTENDED') risks.push('Vertical / extreme extension');
      if (action === 'SUPPORT_LOST') risks.push('Structure broken / support lost');
      if (entry.includes('FAILED BREAKOUT')) risks.push('Failed breakout');
      if (entry === 'EXTENDED') risks.push('Extended beyond normal range');
      if (inv !== null && inv < 40 && trade > 65) risks.push('Hot trade / weak investment quality');

      if (!risks.length) continue;

      const detail = action === 'SUPPORT_LOST' ? 'Prior breakout failed. Wait for base rebuild and reclaim of key level before re-entry.'
        : action === 'TOO_EXTENDED' ? `${tm.extension_risk ?? 'Extended'} — waiting for pullback or base reduces entry risk.`
        : hasBearish ? 'Bullish catalyst is offset by a bearish conflict — net signal is mixed.'
        : inv !== null && inv < 40 ? `Trade setup (${trade}) stronger than investment quality (${inv}). Speculative.`
        : 'Risk flags present — review structure and catalyst before entry.';

      out.push({ r, risks, detail });
      if (out.length >= 12) break;
    }
    return out;
  }, [rows]);

  if (!riskEntries.length) return <EmptyState msg="No significant risk flags detected in current watchlist." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      {riskEntries.map(({ r, risks, detail }, i) => {
        const ticker = fmtTicker(r);
        const trade  = deriveTrade(r);
        return (
          <div key={`risk-${ticker}-${i}`} style={{ background: CC.card, border: `1px solid ${CC.red}35`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: CC.font }}>{ticker}</span>
              <span style={{ fontSize: 8, color: CC.dim, fontFamily: CC.font }}>Trade {trade}</span>
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

/* ─── Expandable Row Breakdown ─────────────────────────────────────── */

export function CaelynRowBreakdown({ stock }: { stock: any }) {
  const action  = deriveActionability(stock);
  const trade   = deriveTrade(stock);
  const entry   = deriveEntryState(stock);
  const why     = deriveWhy(stock, action, trade);
  const { label: stageLabel, score: stageScore, tm } = stageMeta(stock);
  const optScore = stock.options_score != null && Number.isFinite(Number(stock.options_score)) ? Number(stock.options_score) : null;
  const optSig   = (stock.options_signal && stock.options_signal !== 'NO DATA') ? (stock.options_signal as string) : null;
  const volx     = stock.relative_volume != null ? Number(stock.relative_volume) : null;
  const volMc    = stock.vol_mc_pct != null ? Number(stock.vol_mc_pct) : null;
  const inv      = stock.investment_alignment_score != null ? Number(stock.investment_alignment_score) : null;
  const catEvent = stock.catalyst_primary_event || stock.catalyst_v2_primary_event || stock.catalyst_rss_event || stock.catalyst_scheduled_event || null;
  const catSrc   = stock.catalyst_primary_source ?? stock.catalyst_v2_state ?? null;
  const catScore = stock.catalyst_alignment_score ?? stock.catalyst_v2_score ?? null;
  const policyAvail = !!(stock.theme_policy_available);
  const bearish  = stock.catalyst_bearish_conflict || null;
  const eliteRebound = !!(stock.elite_asset_rebound);
  const timing   = typeof tm.technical_timing_score === 'number' ? tm.technical_timing_score : null;

  const lbl: React.CSSProperties = { fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: CC.dim, fontFamily: CC.font, marginBottom: 3 };
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 };
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
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: '14px 22px',
    }}>
      {/* A — Decision */}
      <div style={sec}>
        <div style={lbl}>A — Decision</div>
        <ActionabilityBadge action={action} />
        <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' as const }}>
          <span style={val}>Trade <span style={{ color: scoreColor(trade), fontWeight: 700 }}>{trade}</span></span>
          {inv !== null
            ? <span style={val}>Investment <span style={{ color: scoreColor(inv), fontWeight: 700 }}>{inv}</span></span>
            : <span style={val}>Investment <span style={{ color: CC.dim }}>unavailable</span></span>
          }
        </div>
        <span style={val}>Entry: <span style={valBold}>{entry}</span></span>
      </div>

      {/* B — Trade Components */}
      <div style={sec}>
        <div style={lbl}>B — Trade Components</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...row }}>
          <span style={val}>Stage</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MiniBar value={stageScore} color={CC.teal} />
            <span style={{ ...val, color: CC.text, width: 22, textAlign: 'right' as const }}>{stageScore}</span>
          </div>
        </div>
        {volx !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...row }}>
            <span style={val}>VolX</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MiniBar value={Math.min(100, volx * 20)} color={CC.amber} />
              <span style={{ ...val, color: CC.text, width: 28, textAlign: 'right' as const }}>{volx.toFixed(1)}×</span>
            </div>
          </div>
        )}
        {volMc !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...row }}>
            <span style={val}>Vol/MC</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MiniBar value={Math.min(100, volMc * 7)} color={CC.blue} />
              <span style={{ ...val, color: CC.text, width: 32, textAlign: 'right' as const }}>{volMc.toFixed(1)}%</span>
            </div>
          </div>
        )}
        {optScore !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...row }}>
            <span style={val}>Options</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MiniBar value={optScore} color={CC.purple} />
              <span style={{ ...val, color: scoreColor(optScore), fontWeight: 700, width: 22, textAlign: 'right' as const }}>{Math.round(optScore)}</span>
            </div>
          </div>
        )}
        {timing !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...row }}>
            <span style={val}>Timing</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MiniBar value={timing} color={CC.green} />
              <span style={{ ...val, color: CC.text, width: 22, textAlign: 'right' as const }}>{timing}</span>
            </div>
          </div>
        )}
        {optSig && <span style={{ ...val, color: CC.teal, marginTop: 2 }}>{optSig}</span>}
      </div>

      {/* C — Investment Case */}
      <div style={sec}>
        <div style={lbl}>C — Investment Case</div>
        {inv !== null
          ? <span style={{ ...val, color: scoreColor(inv), fontSize: 12, fontWeight: 700 }}>{inv} / 100</span>
          : <span style={{ ...val, color: CC.dim }}>Investment Alignment: unavailable</span>
        }
        {eliteRebound && <span style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: `${CC.green}1a`, color: CC.green, fontFamily: CC.font, fontWeight: 700, alignSelf: 'flex-start' as const }}>ELITE REBOUND</span>}
        {stageLabel && <span style={val}>Stage: <span style={{ color: CC.teal }}>{stageLabel}</span></span>}
      </div>

      {/* D — Catalyst */}
      <div style={sec}>
        <div style={lbl}>D — Catalyst</div>
        {catEvent
          ? <>
              <span style={{ fontSize: 9, color: CC.amber, fontFamily: CC.font, lineHeight: 1.4 }}>{fmtCatalystEvent(catEvent)}</span>
              {catSrc && <span style={val}>Source: {fmtSource(catSrc)}</span>}
              {catScore != null && <span style={val}>Score: <span style={{ color: scoreColor(Number(catScore)) }}>{Math.round(Number(catScore))}</span></span>}
            </>
          : <span style={val}>Catalyst: None</span>
        }
        {policyAvail
          ? <span style={{ ...val, color: CC.purple }}>
              Policy: {stock.theme_policy_theme ?? '—'}{stock.theme_policy_boost != null ? ` +${stock.theme_policy_boost}` : ''}
              {stock.theme_policy_event ? ` · ${stock.theme_policy_event}` : ''}
            </span>
          : <span style={val}>Policy: None</span>
        }
        {bearish
          ? <span style={{ ...val, color: CC.red }}>⚠ Conflict: {fmtCatalystEvent(bearish)}</span>
          : <span style={val}>Conflict: None</span>
        }
      </div>

      {/* E — Entry Structure */}
      <div style={sec}>
        <div style={lbl}>E — Entry Structure</div>
        <span style={val}>State: <span style={valBold}>{entry}</span></span>
        {timing !== null && <span style={val}>Timing: <span style={{ color: scoreColor(timing) }}>{timing}</span></span>}
        {tm.breakout_signal && <span style={val}>Breakout: <span style={valBold}>{tm.breakout_signal}</span></span>}
        {tm.extension_risk && <span style={val}>Extension: <span style={{ color: tm.extension_risk === 'extreme_extension' ? CC.red : tm.extension_risk === 'extended' ? CC.amber : CC.text }}>{tm.extension_risk}</span></span>}
        {tm.entry_zone && <span style={val}>Zone: <span style={valBold}>{tm.entry_zone}</span></span>}
        {tm.squeeze_signal && <span style={val}>Squeeze: <span style={valBold}>{tm.squeeze_signal}</span></span>}
        {tm.momentum_trend && <span style={val}>Momentum: <span style={{ color: tm.momentum_trend === 'positive' ? CC.green : tm.momentum_trend === 'negative' ? CC.red : CC.dim }}>{tm.momentum_trend}</span></span>}
      </div>

      {/* F — Why / Why Not Now */}
      <div style={{ ...sec, gridColumn: 'span 2' }}>
        <div style={lbl}>F — Why / Why Not Now</div>
        <span style={{ fontSize: 9, color: CC.text, fontFamily: CC.font, lineHeight: 1.55 }}>{why}</span>
      </div>
    </div>
  );
}

/* ─── Main Section ─────────────────────────────────────────────────── */

const CONF_TABS = [
  { key: 'setups',   label: 'Actionable Setups'        },
  { key: 'quality',  label: 'Investment Quality'        },
  { key: 'policy',   label: 'Theme Policy Tailwinds'    },
  { key: 'catalyst', label: 'New Catalysts'             },
  { key: 'risk',     label: 'Risk / Conflicts'          },
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
