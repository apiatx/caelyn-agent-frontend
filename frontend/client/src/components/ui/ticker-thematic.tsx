/**
 * Shared thematic context types + compact UI components.
 * Used by Options Flow and TA/Strategy Screener pages.
 * All fields are optional — if absent, components render nothing.
 */

import { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ThematicFields {
  theme_name?: string | null;
  theme_state?: string | null;
  regime_alignment_score?: number | null;
  regime_alignment_label?: string | null;
  thematic_badges?: string[] | null;
  dead_zone_warning?: boolean | null;
  base_score?: number | null;
  final_score?: number | null;
  sector_alignment?: string | null;
  macro_fit?: string | null;
  theme_score?: number | null;
}

export interface RegimeContextData {
  macro_regime?: string | null;
  active_themes?: string[] | null;
  emerging_themes?: string[] | null;
  dead_zones?: string[] | null;
  [key: string]: unknown;
}

// ── Design tokens (dark-terminal style, compatible with both pages) ──────────

const T = {
  font: "'JetBrains Mono','Fira Code',monospace" as const,
  sans: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" as const,
  dim:    '#64748b',
  text:   '#e2e8f0',
  bright: '#f8fafc',
  border: '#1c2a45',
  surface: '#0c1120',
  indigo:  '#6366f1',
  indigoFg: '#a5b4fc',
};

// ── Internal helpers ───────────────────────────────────────────────────────────

function hasThematicData(f: ThematicFields): boolean {
  return !!(
    f.theme_name ||
    f.theme_state ||
    f.regime_alignment_label ||
    f.regime_alignment_score != null ||
    f.theme_score != null ||
    f.dead_zone_warning
  );
}

function themeStateInfo(state?: string | null) {
  const s = (state || '').toLowerCase().replace(/[-\s]/g, '_');
  if (s === 'active')   return { label: 'Active',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
  if (s === 'emerging') return { label: 'Emerging', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  if (s === 'dead_zone' || s === 'dead') return { label: 'Dead Zone', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  return { label: 'Neutral', color: '#64748b', bg: 'rgba(100,116,139,0.10)' };
}

function regimeAlignmentInfo(label?: string | null, score?: number | null) {
  const l = (label || '').toLowerCase();
  if (l.includes('strong')) return { label: label || 'Strong Regime Fit', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
  if (l.includes('weak'))   return { label: label || 'Weak Regime Fit',   color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  if (l.includes('neutral')) return { label: label || 'Neutral Regime Fit', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' };
  if (score != null) {
    if (score >= 70) return { label: 'Strong Regime Fit', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
    if (score >= 40) return { label: 'Neutral Regime Fit', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' };
    return { label: 'Weak Regime Fit', color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  }
  return null;
}

// ── Primitive ─────────────────────────────────────────────────────────────────

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
      borderRadius: 3, fontSize: 9, fontFamily: T.font, fontWeight: 700,
      letterSpacing: '0.04em', textTransform: 'uppercase' as const,
      color, background: bg, border: `1px solid ${color}33`,
      lineHeight: 1.6, flexShrink: 0, whiteSpace: 'nowrap' as const,
    }}>
      {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: T.font, fontSize: 8, color: T.dim, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: T.font, fontSize: 11, color: T.text }}>{value}</div>
    </div>
  );
}

// ── TickerThematicBadge ───────────────────────────────────────────────────────
// Compact inline badge cluster for table rows / cards.

export function TickerThematicBadge({ fields }: { fields: ThematicFields }) {
  if (!hasThematicData(fields)) return null;

  const stateInfo  = fields.theme_state ? themeStateInfo(fields.theme_state) : null;
  const regimeInfo = (fields.regime_alignment_label || fields.regime_alignment_score != null)
    ? regimeAlignmentInfo(fields.regime_alignment_label, fields.regime_alignment_score)
    : null;
  const scoreVal = fields.theme_score ?? fields.regime_alignment_score;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' as const, marginTop: 4 }}>
      {fields.theme_name && (
        <span style={{
          fontFamily: T.font, fontSize: 9, color: T.indigoFg,
          maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
        }}>
          {fields.theme_name}
        </span>
      )}
      {stateInfo && <Pill label={stateInfo.label} color={stateInfo.color} bg={stateInfo.bg} />}
      {regimeInfo && <Pill label={regimeInfo.label} color={regimeInfo.color} bg={regimeInfo.bg} />}
      {fields.dead_zone_warning && <Pill label="Dead Zone" color="#ef4444" bg="rgba(239,68,68,0.14)" />}
      {scoreVal != null && (
        <span style={{ fontFamily: T.font, fontSize: 9, color: T.dim }}>
          Theme Fit: <span style={{ color: T.text }}>{Math.round(scoreVal)}</span>
        </span>
      )}
    </div>
  );
}

// ── ThematicSection ───────────────────────────────────────────────────────────
// Full thematic breakdown for use inside existing detail panels.

export function ThematicSection({ fields }: { fields: ThematicFields }) {
  if (!hasThematicData(fields)) return null;

  const stateInfo  = fields.theme_state ? themeStateInfo(fields.theme_state) : null;
  const regimeInfo = (fields.regime_alignment_label || fields.regime_alignment_score != null)
    ? regimeAlignmentInfo(fields.regime_alignment_label, fields.regime_alignment_score)
    : null;

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
      <div style={{ fontFamily: T.font, fontSize: 9, color: T.dim, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10 }}>
        Thematic Context
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {fields.theme_name && <Field label="Theme" value={fields.theme_name} />}
        {stateInfo  && <Field label="Theme State"       value={<Pill label={stateInfo.label}  color={stateInfo.color}  bg={stateInfo.bg}  />} />}
        {regimeInfo && <Field label="Regime Alignment"  value={<Pill label={regimeInfo.label} color={regimeInfo.color} bg={regimeInfo.bg} />} />}
        {fields.regime_alignment_score != null && <Field label="Regime Score" value={String(Math.round(fields.regime_alignment_score))} />}
        {fields.theme_score != null             && <Field label="Theme Score"  value={String(Math.round(fields.theme_score))} />}
        {fields.sector_alignment && <Field label="Sector Alignment" value={fields.sector_alignment} />}
        {fields.macro_fit        && <Field label="Macro Fit"        value={fields.macro_fit} />}
        {fields.base_score  != null && <Field label="Base Score"  value={String(Math.round(fields.base_score))} />}
        {fields.final_score != null && <Field label="Final Score" value={String(Math.round(fields.final_score))} />}
        {fields.dead_zone_warning && <Field label="Warning" value={<Pill label="Dead Zone" color="#ef4444" bg="rgba(239,68,68,0.14)" />} />}
      </div>
      {(fields.thematic_badges?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 8 }}>
          {fields.thematic_badges!.map(b => (
            <Pill key={b} label={b} color={T.indigoFg} bg="rgba(99,102,241,0.12)" />
          ))}
        </div>
      )}
    </div>
  );
}

// ── RegimeContextStrip ────────────────────────────────────────────────────────
// Compact collapsible strip above the TA/Screener results table.

export function RegimeContextStrip({ context }: { context?: RegimeContextData | null }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!context) return null;

  const { macro_regime, active_themes = [], emerging_themes = [], dead_zones = [] } = context;
  if (!macro_regime && !active_themes.length && !emerging_themes.length && !dead_zones.length) return null;

  return (
    <div style={{ marginBottom: 14, border: `1px solid ${T.border}`, borderRadius: 6, background: 'rgba(99,102,241,0.04)', overflow: 'hidden' }}>
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', userSelect: 'none' as const }}
      >
        <span style={{ fontFamily: T.font, fontSize: 9, color: T.indigoFg, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700 }}>
          Macro Regime
        </span>
        {macro_regime && (
          <span style={{ fontFamily: T.sans, fontSize: 11, color: T.text }}>{macro_regime}</span>
        )}
        <span style={{ marginLeft: 'auto', fontFamily: T.font, fontSize: 9, color: T.dim }}>
          {collapsed ? '▸ expand' : '▾ collapse'}
        </span>
      </div>
      {!collapsed && (
        <div style={{ display: 'flex', gap: 24, padding: '8px 14px 10px', borderTop: `1px solid ${T.border}`, flexWrap: 'wrap' as const }}>
          {active_themes.slice(0, 3).length > 0 && (
            <div>
              <div style={{ fontFamily: T.font, fontSize: 8, color: '#22c55e', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 5 }}>Active Themes</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                {active_themes.slice(0, 3).map(t => <Pill key={t} label={t} color="#22c55e" bg="rgba(34,197,94,0.10)" />)}
              </div>
            </div>
          )}
          {emerging_themes.slice(0, 2).length > 0 && (
            <div>
              <div style={{ fontFamily: T.font, fontSize: 8, color: '#f59e0b', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 5 }}>Emerging Themes</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                {emerging_themes.slice(0, 2).map(t => <Pill key={t} label={t} color="#f59e0b" bg="rgba(245,158,11,0.10)" />)}
              </div>
            </div>
          )}
          {dead_zones.slice(0, 3).length > 0 && (
            <div>
              <div style={{ fontFamily: T.font, fontSize: 8, color: '#ef4444', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 5 }}>Dead Zones</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                {dead_zones.slice(0, 3).map(t => <Pill key={t} label={t} color="#ef4444" bg="rgba(239,68,68,0.10)" />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TickerInsightDrawer ───────────────────────────────────────────────────────
// Standalone slide-out modal with full thematic context.

export function TickerInsightDrawer({
  ticker,
  fields,
  onClose,
}: {
  ticker: string;
  fields: ThematicFields;
  onClose: () => void;
}) {
  const stateInfo  = fields.theme_state ? themeStateInfo(fields.theme_state) : null;
  const regimeInfo = (fields.regime_alignment_label || fields.regime_alignment_score != null)
    ? regimeAlignmentInfo(fields.regime_alignment_label, fields.regime_alignment_score)
    : null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 199, backdropFilter: 'blur(2px)' }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(440px, 100vw)', background: T.surface,
        borderLeft: `1px solid ${T.border}`, zIndex: 200,
        display: 'flex', flexDirection: 'column' as const,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <span style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.bright, flex: 1 }}>
            {ticker} — Thematic Context
          </span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 4, color: T.dim, cursor: 'pointer', padding: '4px 8px', fontFamily: T.font, fontSize: 11 }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: 20 }}>
          <div style={{ display: 'grid', gap: 14 }}>
            {fields.theme_name && <Field label="Theme" value={fields.theme_name} />}
            {stateInfo  && <Field label="Theme State"      value={<Pill label={stateInfo.label}  color={stateInfo.color}  bg={stateInfo.bg}  />} />}
            {regimeInfo && <Field label="Regime Alignment" value={<Pill label={regimeInfo.label} color={regimeInfo.color} bg={regimeInfo.bg} />} />}
            {fields.regime_alignment_score != null && <Field label="Regime Alignment Score" value={String(Math.round(fields.regime_alignment_score))} />}
            {fields.theme_score != null             && <Field label="Theme Score"            value={String(Math.round(fields.theme_score))} />}
            {fields.sector_alignment && <Field label="Sector Alignment" value={fields.sector_alignment} />}
            {fields.macro_fit        && <Field label="Macro Fit"        value={fields.macro_fit} />}
            {fields.base_score  != null && <Field label="Base Score"  value={String(Math.round(fields.base_score))} />}
            {fields.final_score != null && <Field label="Final Score" value={String(Math.round(fields.final_score))} />}
            {fields.dead_zone_warning && <Field label="Warning" value={<Pill label="Dead Zone" color="#ef4444" bg="rgba(239,68,68,0.14)" />} />}
          </div>
          {(fields.thematic_badges?.length ?? 0) > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: T.font, fontSize: 8, color: T.dim, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
                Thematic Badges
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                {fields.thematic_badges!.map(b => (
                  <Pill key={b} label={b} color={T.indigoFg} bg="rgba(99,102,241,0.12)" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
