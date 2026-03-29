import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Decision = 'YES' | 'CAUTION' | 'NO';
type Direction = 'up' | 'down' | 'flat';
type Mode = 'swing' | 'day';
type TerminalType = 'dim' | 'red' | 'green' | 'yellow' | 'blue' | 'white';

interface Metric { label: string; value: string; status?: string; ok: boolean; }
interface Pillar { title: string; score: number; weight: number; direction: Direction; metrics: Metric[]; }
interface ExecutionCondition { label: string; value?: string; status?: string; ok: boolean; }
interface TerminalLine { type: TerminalType; text: string; }
interface SectorItem { ticker: string; name: string; change_pct: number; }
interface TradingDashboardData {
  decision: Decision; market_quality_score: number; execution_window_score: number; mode: Mode;
  pillars: Pillar[]; summary: string; execution_conditions: ExecutionCondition[];
  terminal_analysis: TerminalLine[]; alert: { show: boolean; text: string }; as_of: string; from_cache: boolean;
  sector_performance?: SectorItem[];
}

const C = {
  bg: '#0d1117', card: '#161b22', border: '#21262d', borderBright: '#30363d',
  text: '#e6edf3', dim: '#8b949e', dimLow: '#484f58',
  green: '#3fb950', yellow: '#e3b341', orange: '#f0883e', red: '#f85149', blue: '#58a6ff',
};

function scoreColor(s: number) {
  if (s >= 70) return C.green;
  if (s >= 50) return C.yellow;
  if (s >= 30) return C.orange;
  return C.red;
}
function decisionColor(d: Decision) {
  if (d === 'YES') return C.green;
  if (d === 'CAUTION') return C.yellow;
  return C.red;
}
function dirArrow(d: Direction) { return d === 'up' ? '▲' : d === 'down' ? '▼' : '─'; }
function termColor(t: TerminalType) {
  if (t === 'red') return C.red; if (t === 'green') return C.green;
  if (t === 'yellow') return C.yellow; if (t === 'blue') return C.blue;
  if (t === 'white') return C.text; return C.dim;
}
function parseVal(v: string): { main: string; sub: string } {
  const m = v.match(/^([^(]+?)(?:\s*\(([^)]+)\))?$/);
  return { main: m?.[1]?.trim() ?? v, sub: m?.[2]?.trim() ?? '' };
}
function statusWordColor(status: string, ok: boolean): string {
  const s = status.toLowerCase();
  const neutral = ['normal','neutral','stable','moderate','easing','upcoming','soon','hold','clear','upcoming'];
  if (neutral.some(w => s === w || s.startsWith(w))) return C.yellow;
  return ok ? C.green : C.red;
}
function pillarIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('volat')) return '⚡';
  if (t.includes('trend')) return '↗';
  if (t.includes('breadth')) return '≋';
  if (t.includes('macro') || t.includes('liquid')) return '◉';
  if (t.includes('moment') || t.includes('sent')) return '◎';
  return '●';
}
function positionLabel(d: Decision) {
  if (d === 'YES') return { label: 'FULL SIZE', sub: 'Press risk' };
  if (d === 'CAUTION') return { label: 'SELECTIVE', sub: 'Half size' };
  return { label: 'MINIMAL', sub: 'Preserve capital' };
}

function findMetric(pillars: Pillar[], titleKey: string, labelKey: string): Metric | undefined {
  const p = pillars.find(p => p.title.toLowerCase().includes(titleKey.toLowerCase()));
  return p?.metrics.find(m => m.label.toLowerCase().includes(labelKey.toLowerCase()));
}

const fetchDashboard = async (mode: Mode): Promise<TradingDashboardData> => {
  const res = await fetch(`/api/trading-dashboard?mode=${mode}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
};
const postRefresh = async (mode: Mode): Promise<TradingDashboardData> => {
  const r = await fetch(`/api/trading-dashboard/refresh?mode=${mode}`, { method: 'POST' });
  if (!r.ok) return fetchDashboard(mode);
  return r.json();
};

/* ─── Circular Gauge ─────────────────────────────────────── */
function Gauge({ score, size = 120, thick = 9 }: { score: number; size?: number; thick?: number }) {
  const r = (size - thick * 2) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ - (Math.min(Math.max(score, 0), 100) / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.card} strokeWidth={thick} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thick}
        strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${color}88)` }} />
    </svg>
  );
}

/* ─── Ticker Tape ─────────────────────────────────────────── */
function TickerTape({ pillars }: { pillars: Pillar[] }) {
  const items: { label: string; val: string; ok?: boolean }[] = [];
  // Extract key values from metrics
  const vix = findMetric(pillars, 'volat', 'vix');
  const fg = findMetric(pillars, 'volat', 'fear');
  const tnx = findMetric(pillars, 'macro', '10y');
  const dxy = findMetric(pillars, 'macro', 'dxy');
  const spyChg = findMetric(pillars, 'trend', 'spy chg');
  const qqqChg = findMetric(pillars, 'trend', 'qqq');
  const hyoas = findMetric(pillars, 'volat', 'oas');
  const spread = findMetric(pillars, 'macro', '2s10s');

  if (vix) items.push({ label: 'VIX', val: parseVal(vix.value).main, ok: vix.ok });
  if (fg) items.push({ label: 'FEAR/GREED', val: parseVal(fg.value).main, ok: fg.ok });
  if (tnx) items.push({ label: 'TNX', val: parseVal(tnx.value).main, ok: tnx.ok });
  if (dxy) items.push({ label: 'DXY', val: parseVal(dxy.value).main, ok: dxy.ok });
  if (spyChg) items.push({ label: 'SPY', val: parseVal(spyChg.value).main, ok: spyChg.ok });
  if (qqqChg) items.push({ label: 'QQQ', val: parseVal(qqqChg.value).main, ok: qqqChg.ok });
  if (hyoas) items.push({ label: 'HY OAS', val: parseVal(hyoas.value).main, ok: hyoas.ok });
  if (spread) items.push({ label: '2s10s', val: parseVal(spread.value).main, ok: spread.ok });
  for (const p of pillars) items.push({ label: p.title.split('/')[0].trim(), val: p.score.toFixed(0) + '/100' });
  const doubled = [...items, ...items, ...items];

  return (
    <div style={{ background: '#090d12', borderBottom: `1px solid ${C.border}`, overflow: 'hidden', height: 28, display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', animation: 'ticker 60s linear infinite', whiteSpace: 'nowrap', willChange: 'transform' }}>
        {doubled.map((it, i) => {
          const valColor = it.ok === undefined ? C.dim : it.ok ? C.green : C.red;
          return (
            <span key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '0 18px', fontFamily: 'monospace', fontSize: 11 }}>
              <span style={{ color: C.dim }}>{it.label}</span>
              <span style={{ color: valColor, fontWeight: 600 }}>{it.val}</span>
              <span style={{ color: C.dimLow, marginLeft: 4 }}>│</span>
            </span>
          );
        })}
      </div>
      <style>{`@keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }`}</style>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function ShouldIBeTrading() {
  const [mode, setMode] = useState<Mode>('swing');
  const [timeLeft, setTimeLeft] = useState(45);
  const qc = useQueryClient();

  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['trading-dashboard', mode],
    queryFn: () => fetchDashboard(mode),
    refetchInterval: 45000,
    staleTime: 30000,
    retry: 2,
  });

  const refresh = useMutation({
    mutationFn: () => postRefresh(mode),
    onSuccess: (d) => { qc.setQueryData(['trading-dashboard', mode], d); setTimeLeft(45); },
  });

  useEffect(() => {
    setTimeLeft(45);
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [dataUpdatedAt]);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: C.blue, letterSpacing: 3, fontSize: 12, marginBottom: 12 }}>LOADING MARKET DATA...</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {[0,1,2].map(i => <div key={i} style={{ width:7,height:7,borderRadius:'50%',background:C.blue,animation:`blink 1s ${i*0.3}s infinite` }}/>)}
        </div>
        <style>{`@keyframes blink{0%,100%{opacity:.15}50%{opacity:1}}`}</style>
      </div>
    </div>
  );

  if (isError || !data) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>⚠ BACKEND UNREACHABLE</div>
        <button onClick={() => refresh.mutate()} style={{ padding: '6px 18px', background: 'transparent', border: `1px solid ${C.blue}`, color: C.blue, fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}>↻ RETRY</button>
      </div>
    </div>
  );

  const d = data;
  const mqs = d.market_quality_score;
  const ews = d.execution_window_score;
  const dc = decisionColor(d.decision);
  const pos = positionLabel(d.decision);
  const asOf = new Date(d.as_of);
  const secsAgo = Math.round((Date.now() - asOf.getTime()) / 1000);
  const agoLabel = secsAgo < 90 ? `${secsAgo}s ago` : secsAgo < 3600 ? `${Math.round(secsAgo/60)}m ago` : asOf.toLocaleTimeString();

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"SF Mono","Fira Code","Consolas",monospace', fontSize: 12, lineHeight: 1.5 }}>

      {/* ── TOP BAR ─────────────────────────────────── */}
      <div style={{ background: '#090d12', borderBottom: `1px solid ${C.border}`, padding: '0 16px', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: C.text, letterSpacing: 1 }}>SHOULD I BE TRADING?</span>
          <span style={{ color: C.dimLow, fontSize: 10, letterSpacing: 2 }}>MARKET QUALITY TERMINAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {(['swing','day'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '4px 12px', background: mode===m ? '#1f2937' : 'transparent', color: mode===m ? C.yellow : C.dim, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: mode===m ? 700 : 400 }}>
                {m}
              </button>
            ))}
          </div>
          {/* Live indicator */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: d.from_cache ? C.yellow : C.green }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.from_cache ? C.yellow : C.green, display: 'inline-block', boxShadow: `0 0 6px ${d.from_cache ? C.yellow : C.green}` }} />
            {d.from_cache ? 'CACHED' : 'LIVE'}
          </span>
          <span style={{ color: C.dimLow, fontSize: 10 }}>{agoLabel}</span>
          <button onClick={() => refresh.mutate()} disabled={refresh.isPending} style={{ background: 'transparent', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 13, padding: '2px 4px', opacity: refresh.isPending ? 0.4 : 1 }} title="Refresh">↻</button>
        </div>
      </div>

      {/* ── TICKER TAPE ─────────────────────────────── */}
      <TickerTape pillars={d.pillars} />

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── HERO ROW ────────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 0 }}>

          {/* DECISION box */}
          <div style={{ minWidth: 110, paddingRight: 18, borderRight: `1px solid ${C.border}` }}>
            <div style={{ color: C.dim, fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>DECISION</div>
            <div style={{ width: 68, height: 52, border: `2px solid ${dc}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${dc}44`, background: `${dc}0d` }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: dc, letterSpacing: 1 }}>{d.decision}</span>
            </div>
            <div style={{ color: C.dimLow, fontSize: 9, marginTop: 5, textTransform: 'capitalize' }}>{d.mode} Trading</div>
          </div>

          {/* Circular gauge */}
          <div style={{ padding: '0 20px', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gauge score={mqs} size={110} thick={8} />
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: scoreColor(mqs), lineHeight: 1 }}>{mqs.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: C.dim, lineHeight: 1 }}>/ 100</div>
              </div>
            </div>
          </div>

          {/* 5 mini-pillar cards */}
          <div style={{ flex: 1, display: 'flex', gap: 0, padding: '0 10px' }}>
            {d.pillars.map((p, i) => {
              const color = scoreColor(p.score);
              const barWidth = Math.min(p.score, 100);
              return (
                <div key={i} style={{ flex: 1, padding: '0 12px', borderRight: i < d.pillars.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 14, color: C.dim }}>{pillarIcon(p.title)}</div>
                  <div style={{ fontSize: 8, color: C.dim, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' }}>
                    {p.title.split('/')[0].trim().replace('MARKET ','').replace('MOMENTUM','MOM').replace('VOLATILITY','VOLAT')}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{p.score.toFixed(0)}</div>
                  {/* Score bar */}
                  <div style={{ width: '100%', height: 3, background: C.bg, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: color, borderRadius: 2, boxShadow: `0 0 4px ${color}88`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* POSITION SIZE */}
          <div style={{ minWidth: 110, paddingLeft: 18, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ color: C.dim, fontSize: 9, letterSpacing: 2 }}>POSITION SIZE</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gauge score={mqs} size={46} thick={4} />
              <span style={{ position: 'absolute', fontSize: 8, color: dc, fontWeight: 700 }}>●</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: dc }}>{pos.label}</div>
            <div style={{ fontSize: 9, color: C.dimLow, textAlign: 'center' }}>{pos.sub}</div>
          </div>
        </div>

        {/* ── ALERT BANNER ─────────────────────────── */}
        {d.alert.show && (
          <div style={{ background: '#1a1400', border: `1px solid ${C.yellow}44`, borderRadius: 4, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: C.yellow, fontSize: 12 }}>⚠</span>
            <span style={{ color: C.yellow, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>MACRO ALERT</span>
            <span style={{ color: '#d1a500', fontSize: 11 }}>{d.alert.text}</span>
          </div>
        )}

        {/* ── 5 PILLAR CARDS ───────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {d.pillars.map((p, i) => {
            const color = scoreColor(p.score);
            const dColor = p.direction === 'up' ? C.green : p.direction === 'down' ? C.red : C.dim;
            return (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11 }}>{pillarIcon(p.title)}</span>
                      <span style={{ color: C.dim, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        {p.title.split('/')[0].trim().replace('MARKET ','')}
                      </span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 900, color }}>{p.score.toFixed(0)}</span>
                  </div>
                  {/* Score bar */}
                  <div style={{ marginTop: 6, height: 3, background: C.bg, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.min(p.score, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
                {/* Metrics */}
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p.metrics.map((m, j) => {
                    const { main, sub } = parseVal(m.value);
                    const statusText = m.status ?? sub ?? '';
                    const sColor = statusText ? statusWordColor(statusText, m.ok) : (m.ok ? C.green : C.red);
                    return (
                      <div key={j} style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
                        <span style={{ color: C.dimLow, fontSize: 10, flexShrink: 0 }}>●</span>
                        <span style={{ color: C.dim, fontSize: 10, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{m.label}</span>
                        <span style={{ color: C.text, fontSize: 10, fontWeight: 600, flexShrink: 0, marginLeft: 4, whiteSpace: 'nowrap' }}>{main}</span>
                        {statusText
                          ? <span style={{ color: sColor, fontSize: 9, flexShrink: 0, marginLeft: 3, whiteSpace: 'nowrap' }}>{statusText}</span>
                          : <span style={{ color: m.ok ? C.green : C.red, fontSize: 9, flexShrink: 0, marginLeft: 3 }}>{m.ok ? '↑' : '↓'}</span>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── BOTTOM ROW ────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr 240px', gap: 8 }}>

          {/* EXECUTION WINDOW */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: C.red, fontSize: 10 }}>◈</span>
                <span style={{ color: C.dim, fontSize: 9, letterSpacing: 1.5 }}>EXECUTION WINDOW</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor(ews) }}>{ews.toFixed(0)}</span>
            </div>
            {/* Score bar */}
            <div style={{ height: 2, background: C.bg }}>
              <div style={{ height: '100%', width: `${Math.min(ews,100)}%`, background: scoreColor(ews), transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {d.execution_conditions.map((ec, i) => {
                const okColor = ec.ok ? C.green : C.red;
                const statusColor = ec.status ? statusWordColor(ec.status, ec.ok) : okColor;
                // Clean up verbose labels — keep question-style if short, strip parenthetical suffixes
                const rawLabel = ec.label.includes('(') ? ec.label.split('(')[0].trim() : ec.label;
                const displayLabel = rawLabel
                  .replace(/\bvolatility acceptable\b/gi,'')
                  .replace(/\btrend intact\b/gi,'')
                  .replace(/\btoday\/tomorrow\b/gi,'')
                  .replace(/\bsectors positive\b/gi,'positive')
                  .replace(/\bbelow\b/gi,'below')
                  .trim();

                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {/* Label */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <span style={{ color: C.dimLow, fontSize: 10, flexShrink: 0 }}>●</span>
                      <span style={{ color: C.dim, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLabel}</span>
                    </span>
                    {/* Value */}
                    <span style={{ color: C.text, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {ec.value ?? (ec.ok ? 'Yes' : 'No')}
                    </span>
                    {/* Status badge */}
                    <span style={{
                      color: statusColor,
                      fontSize: 9,
                      fontStyle: 'italic',
                      whiteSpace: 'nowrap',
                      minWidth: 64,
                      textAlign: 'right',
                    }}>
                      {ec.status ?? (ec.ok ? 'PASS' : 'FAIL')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MARKET METRICS — pillar scores as bars */}
          {(() => {
            const allMetrics = d.pillars.flatMap(p => p.metrics.map(m => ({ ...m })));
            const barItems = allMetrics.slice(0, 10);
            return (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: C.dim, fontSize: 10 }}>◎</span>
                    <span style={{ color: C.dim, fontSize: 9, letterSpacing: 1.5 }}>MARKET METRICS</span>
                  </div>
                  <span style={{ color: C.dimLow, fontSize: 9 }}>all pillars</span>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {barItems.map((m, i) => {
                    const { main } = parseVal(m.value);
                    const isScore = /^\d+\/100$/.test(main);
                    const numVal = isScore ? parseInt(main) : null;
                    const barPct = numVal !== null ? numVal : (m.ok ? 70 : 25);
                    const color = m.ok ? C.green : C.red;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: C.dimLow, fontSize: 9, width: 68, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
                        <div style={{ flex: 1, height: 9, background: C.bg, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ color, fontSize: 9, fontWeight: 600, width: 38, textAlign: 'right', flexShrink: 0 }}>{main}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* SECTOR PERFORMANCE */}
          {(() => {
            const sectors = d.sector_performance;
            const hasSectors = sectors && sectors.length > 0;
            const minPct = hasSectors ? Math.min(...sectors.map(s => s.change_pct)) : -3;
            const maxPct = hasSectors ? Math.max(...sectors.map(s => s.change_pct)) : 3;
            const absMax = Math.max(Math.abs(minPct), Math.abs(maxPct), 0.01);
            return (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: C.dim, fontSize: 10 }}>▤</span>
                    <span style={{ color: C.dim, fontSize: 9, letterSpacing: 1.5 }}>SECTOR PERFORMANCE</span>
                  </div>
                  {!hasSectors && <span style={{ color: C.dimLow, fontSize: 9 }}>awaiting data</span>}
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {hasSectors ? sectors.map((s, i) => {
                    const isPos = s.change_pct >= 0;
                    const color = isPos ? C.green : C.red;
                    const barPct = (Math.abs(s.change_pct) / absMax) * 100;
                    const shortName = s.name.replace('Consumer ', 'Con ').replace('Communication', 'Communic.').replace('Real Estate', 'Real Est.').replace('Technology', 'Tech').replace('Industrials', 'Industrl').replace('Materials', 'Material').replace('Financials', 'Finance').replace('Utilities', 'Utilities').replace('Health Care', 'Hlth Care');
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: C.dimLow, fontSize: 9, width: 62, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName}</span>
                        <div style={{ flex: 1, height: 9, background: C.bg, borderRadius: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: isPos ? 'flex-start' : 'flex-end' }}>
                          <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ color, fontSize: 9, fontWeight: 600, width: 42, textAlign: 'right', flexShrink: 0 }}>
                          {isPos ? '+' : ''}{s.change_pct.toFixed(2)}%
                        </span>
                      </div>
                    );
                  }) : (
                    /* Placeholder bars while awaiting backend deploy */
                    d.pillars.map((p, i) => {
                      const color = scoreColor(p.score);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ color: C.dimLow, fontSize: 9, width: 62, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.title.split('/')[0].trim().replace('MARKET ','').replace('MOMENTUM','Mom').replace('VOLATILITY','Volat')}
                          </span>
                          <div style={{ flex: 1, height: 9, background: C.bg, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(p.score,100)}%`, background: color, borderRadius: 2, opacity: 0.35 }} />
                          </div>
                          <span style={{ color: C.dimLow, fontSize: 9, width: 42, textAlign: 'right', flexShrink: 0 }}>—</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* SCORING WEIGHTS */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: C.dim, fontSize: 10 }}>▦</span>
                <span style={{ color: C.dim, fontSize: 9, letterSpacing: 1.5 }}>SCORING WEIGHTS</span>
              </div>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {d.pillars.map((p, i) => {
                const color = scoreColor(p.score);
                const shortTitle = p.title.split('/')[0].trim().replace('MARKET ','').replace('MOMENTUM','Momentum').replace('VOLATILITY','Volatility');
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: C.dim, fontSize: 9, width: 64, flexShrink: 0 }}>{shortTitle}</span>
                    <div style={{ flex: 1, height: 10, background: C.bg, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(p.score, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                    </div>
                    <span style={{ color, fontSize: 10, fontWeight: 700, width: 20, textAlign: 'right', flexShrink: 0 }}>{p.score.toFixed(0)}</span>
                    <span style={{ color: C.dimLow, fontSize: 9, width: 28, textAlign: 'right', flexShrink: 0 }}>+{p.weight}%</span>
                  </div>
                );
              })}
              {/* Total */}
              <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.dim, fontSize: 10 }}>TOTAL SCORE</span>
                <span style={{ color: scoreColor(mqs), fontSize: 14, fontWeight: 900 }}>{mqs.toFixed(0)}/100</span>
              </div>
              {/* Legend */}
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  { dot: C.green, text: '80–100: YES (press risk)' },
                  { dot: C.yellow, text: '60–79: CAUTION (selective)' },
                  { dot: C.red, text: '<60: NO (preserve capital)' },
                ].map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.dot, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ color: C.dimLow, fontSize: 9 }}>{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── TERMINAL ANALYSIS ─────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: C.dim, fontSize: 10 }}>▶</span>
              <span style={{ color: C.dim, fontSize: 9, letterSpacing: 1.5 }}>TERMINAL ANALYSIS</span>
              <span style={{ color: C.dimLow, fontSize: 9, padding: '1px 6px', border: `1px solid ${C.dimLow}44`, borderRadius: 2 }}>AI-generated market assessment</span>
            </div>
            <span style={{ color: C.dimLow, fontSize: 9 }}>Updated {asOf.toLocaleString()}</span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            {d.terminal_analysis.map((line, i) => (
              <div key={i} style={{ fontFamily: 'inherit', fontSize: 11, lineHeight: 1.9, color: termColor(line.type), whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {line.text || '\u00A0'}
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ───────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 2px', color: C.dimLow, fontSize: 9 }}>
          <span>Data: Live backend pipeline | Auto-refresh: 45s | Not financial advice</span>
          <span>Refresh in {timeLeft}s</span>
        </div>

      </div>
    </div>
  );
}
