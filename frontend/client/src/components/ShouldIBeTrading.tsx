import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Decision = 'YES' | 'CAUTION' | 'NO';
type Direction = 'up' | 'down' | 'flat';
type Mode = 'swing' | 'day';
type TerminalType = 'dim' | 'red' | 'green' | 'yellow' | 'blue' | 'white';

interface Metric {
  label: string;
  value: string;
  ok: boolean;
}

interface Pillar {
  title: string;
  score: number;
  weight: number;
  direction: Direction;
  metrics: Metric[];
}

interface ExecutionCondition {
  label: string;
  ok: boolean;
}

interface TerminalLine {
  type: TerminalType;
  text: string;
}

interface Alert {
  show: boolean;
  text: string;
}

interface TradingDashboardData {
  decision: Decision;
  market_quality_score: number;
  execution_window_score: number;
  mode: Mode;
  pillars: Pillar[];
  summary: string;
  execution_conditions: ExecutionCondition[];
  terminal_analysis: TerminalLine[];
  alert: Alert;
  as_of: string;
  from_cache: boolean;
}

const AGENT_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';

const fetchDashboard = async (mode: Mode): Promise<TradingDashboardData> => {
  const res = await fetch(`/api/trading-dashboard?mode=${mode}`);
  if (!res.ok) throw new Error('Failed to fetch dashboard data');
  return res.json();
};

const postRefresh = async (mode: Mode): Promise<TradingDashboardData> => {
  const res = await fetch(`/api/trading-dashboard/refresh?mode=${mode}`, { method: 'POST' });
  if (!res.ok) {
    const res2 = await fetch(`/api/trading-dashboard?mode=${mode}`);
    if (!res2.ok) throw new Error('Failed to refresh');
    return res2.json();
  }
  return res.json();
};

function dir(d: Direction) {
  if (d === 'up') return '↑';
  if (d === 'down') return '↓';
  return '→';
}

function scoreColor(s: number) {
  if (s >= 70) return '#00ff88';
  if (s >= 50) return '#ffbb00';
  return '#ff4444';
}

function decisionConfig(d: Decision) {
  if (d === 'YES') return { border: '#00ff88', text: '#00ff88', glow: '0 0 32px #00ff8855', bg: '#00ff8811', action: 'Full position sizing. Press risk on A+ setups.' };
  if (d === 'CAUTION') return { border: '#ffbb00', text: '#ffbb00', glow: '0 0 32px #ffbb0055', bg: '#ffbb0011', action: 'Half size. A+ setups only.' };
  return { border: '#ff4444', text: '#ff4444', glow: '0 0 32px #ff444455', bg: '#ff444411', action: 'Stay flat. Preserve capital.' };
}

function terminalColor(type: TerminalType) {
  if (type === 'red') return '#ff4444';
  if (type === 'green') return '#00ff88';
  if (type === 'yellow') return '#ffbb00';
  if (type === 'blue') return '#4488ff';
  if (type === 'white') return '#ccdeff';
  return '#4a6080';
}

function CircleScore({ score, size = 130 }: { score: number; size?: number }) {
  const r = (size - 18) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0d1a28" strokeWidth={9} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={9}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dashoffset 0.9s ease' }} />
    </svg>
  );
}

function MiniCircle({ score, size = 50 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0d1a28" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})`, transition: 'stroke-dashoffset 0.9s ease' }} />
    </svg>
  );
}

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
    onSuccess: (newData) => {
      qc.setQueryData(['trading-dashboard', mode], newData);
      setTimeLeft(45);
    },
  });

  useEffect(() => {
    setTimeLeft(45);
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [dataUpdatedAt]);

  const handleRefresh = useCallback(() => { refresh.mutate(); }, [mode]);
  const handleMode = (m: Mode) => { setMode(m); };

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#030810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, letterSpacing: 4, color: '#2a88ff', marginBottom: 14 }}>LOADING MARKET DATA</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a88ff', animation: `blip 1s ${i * 0.25}s infinite` }} />)}
        </div>
        <style>{`@keyframes blip{0%,100%{opacity:.2}50%{opacity:1}}`}</style>
      </div>
    </div>
  );

  if (isError || !data) return (
    <div style={{ minHeight: '100vh', background: '#030810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center', color: '#ff4444' }}>
        <div style={{ fontSize: 13, marginBottom: 16 }}>⚠ FAILED TO LOAD — BACKEND UNREACHABLE</div>
        <button onClick={handleRefresh} style={{ padding: '8px 20px', background: '#0a1828', border: '1px solid #2a88ff', color: '#2a88ff', fontFamily: 'monospace', cursor: 'pointer', fontSize: 11, letterSpacing: 1 }}>↻ RETRY</button>
      </div>
    </div>
  );

  const d = data;
  const dc = decisionConfig(d.decision);
  const mqs = d.market_quality_score;
  const ews = d.execution_window_score;
  const updatedAt = new Date(d.as_of).toLocaleTimeString();

  return (
    <div style={{ minHeight: '100vh', background: '#030810', color: '#ccdeff', fontFamily: 'monospace', fontSize: 12 }}>

      {/* ── TOP BAR ─────────────────────────────────────── */}
      <div style={{ background: '#050c18', borderBottom: '1px solid #1a2a3a', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2a88ff', letterSpacing: 2 }}>SHOULD I BE TRADING?</span>
          <span style={{ fontSize: 9, padding: '2px 8px', letterSpacing: 2, border: `1px solid ${d.from_cache ? '#ffbb0044' : '#00ff8844'}`, color: d.from_cache ? '#ffbb00' : '#00ff88', background: d.from_cache ? '#ffbb0011' : '#00ff8811' }}>
            ● {d.from_cache ? 'CACHED' : 'LIVE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 10 }}>
          <div style={{ display: 'flex', border: '1px solid #1a2a3a' }}>
            {(['swing', 'day'] as Mode[]).map(m => (
              <button key={m} onClick={() => handleMode(m)}
                style={{ padding: '4px 14px', background: mode === m ? '#1a3a5a' : 'transparent', color: mode === m ? '#2a88ff' : '#4a6080', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                {m}
              </button>
            ))}
          </div>
          <span style={{ color: '#3a5070' }}>as of <span style={{ color: '#6a8090' }}>{updatedAt}</span></span>
          <span style={{ color: '#3a5070' }}>refresh in <span style={{ color: timeLeft < 10 ? '#ffbb00' : '#6a8090' }}>{timeLeft}s</span></span>
          <button onClick={handleRefresh} disabled={refresh.isPending}
            style={{ padding: '4px 14px', background: '#0a1828', border: '1px solid #2a88ff', color: '#2a88ff', fontFamily: 'monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1, opacity: refresh.isPending ? 0.5 : 1 }}>
            {refresh.isPending ? 'UPDATING...' : '↻ REFRESH'}
          </button>
        </div>
      </div>

      {/* ── ALERT BANNER ─────────────────────────────────── */}
      {d.alert.show && (
        <div style={{ background: '#1a0a00', borderBottom: '1px solid #ff440033', padding: '7px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#ff8844', letterSpacing: 2, fontSize: 10 }}>⚠ MACRO ALERT</span>
          <span style={{ color: '#ffbb00', fontSize: 11 }}>{d.alert.text}</span>
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── HERO ROW ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 12 }}>

          {/* Decision Badge */}
          <div style={{ background: '#080f1a', border: `1px solid ${dc.border}`, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, boxShadow: dc.glow }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: '#4a6080' }}>SHOULD I TRADE TODAY?</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircleScore score={mqs} size={130} />
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: dc.text, letterSpacing: 2, lineHeight: 1 }}>{d.decision}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: dc.text, lineHeight: 1.1 }}>{mqs.toFixed(0)}</div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: '#4a6080', letterSpacing: 2, textAlign: 'center' }}>MARKET QUALITY SCORE</div>
            <div style={{ width: '100%', height: 1, background: '#1a2a3a' }} />
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#4a6080', fontSize: 10 }}>EXEC WINDOW</span>
                <span style={{ color: scoreColor(ews), fontSize: 10, fontWeight: 700 }}>{ews.toFixed(0)} / 100</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4a6080', fontSize: 10 }}>MODE</span>
                <span style={{ color: '#2a88ff', fontSize: 10 }}>{d.mode.toUpperCase()}</span>
              </div>
            </div>
            <div style={{ fontSize: 9, color: dc.text, textAlign: 'center', lineHeight: 1.7, padding: '6px 0 0' }}>{dc.action}</div>
          </div>

          {/* Scoring Breakdown */}
          <div style={{ background: '#080f1a', border: '1px solid #1a2a3a', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 9, color: '#4a6080', letterSpacing: 3, marginBottom: 4 }}>SCORING BREAKDOWN</div>
            {d.pillars.map((p, i) => {
              const color = scoreColor(p.score);
              const dColor = p.direction === 'up' ? '#00ff88' : p.direction === 'down' ? '#ff4444' : '#8899aa';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#4a6080', fontSize: 10, width: 148, flexShrink: 0 }}>{p.title}</span>
                  <span style={{ color: '#3a5070', fontSize: 9, width: 32, flexShrink: 0 }}>×{p.weight}%</span>
                  <div style={{ flex: 1, height: 12, background: '#0a1520', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(p.score, 100)}%`, background: color, borderRadius: 2, filter: `drop-shadow(0 0 3px ${color})`, transition: 'width 0.9s ease' }} />
                  </div>
                  <span style={{ color, fontSize: 12, fontWeight: 700, width: 32, textAlign: 'right', flexShrink: 0 }}>{p.score.toFixed(0)}</span>
                  <span style={{ color: dColor, fontSize: 13, width: 14, flexShrink: 0 }}>{dir(p.direction)}</span>
                </div>
              );
            })}
            <div style={{ height: 1, background: '#1a2a3a', margin: '4px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#6a8090', fontSize: 10, fontWeight: 700, width: 148, flexShrink: 0 }}>COMPOSITE (MQS)</span>
              <span style={{ color: '#3a5070', fontSize: 9, width: 32, flexShrink: 0 }}>100%</span>
              <div style={{ flex: 1, height: 14, background: '#0a1520', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(mqs, 100)}%`, background: `linear-gradient(90deg, ${scoreColor(mqs)}, ${scoreColor(mqs)}88)`, borderRadius: 2, transition: 'width 0.9s ease' }} />
              </div>
              <span style={{ color: scoreColor(mqs), fontSize: 13, fontWeight: 900, width: 32, textAlign: 'right', flexShrink: 0 }}>{mqs.toFixed(0)}</span>
              <span style={{ color: dc.text, fontSize: 10, fontWeight: 700, width: 14, flexShrink: 0 }} />
            </div>
            <div style={{ marginTop: 8, padding: '10px 12px', background: '#060d18', border: `1px solid ${dc.border}22`, borderLeft: `3px solid ${dc.border}` }}>
              <div style={{ fontSize: 10, color: '#4a6080', marginBottom: 4, letterSpacing: 1 }}>SUMMARY</div>
              <div style={{ fontSize: 11, color: '#8899cc', lineHeight: 1.7 }}>{d.summary}</div>
            </div>
          </div>
        </div>

        {/* ── PILLAR PANELS GRID ───────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 12 }}>
          {d.pillars.map((p, i) => {
            const topColor = scoreColor(p.score);
            const dColor = p.direction === 'up' ? '#00ff88' : p.direction === 'down' ? '#ff4444' : '#8899aa';
            return (
              <div key={i} style={{ background: '#080f1a', border: '1px solid #1a2a3a', borderTop: `2px solid ${topColor}`, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Pillar header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2, textTransform: 'uppercase' }}>{i + 1}. {p.title}</div>
                    <div style={{ fontSize: 9, color: '#3a5070', marginTop: 3 }}>Weight: {p.weight}%</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MiniCircle score={p.score} />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: topColor, lineHeight: 1 }}>{p.score.toFixed(0)}</div>
                      <div style={{ fontSize: 11, color: dColor }}>{dir(p.direction)} {p.direction.toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: '#111d2d' }} />

                {/* Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {p.metrics.map((m, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#4a6080', fontSize: 10 }}>{m.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#8899cc', fontSize: 11 }}>{m.value}</span>
                        <span style={{ color: m.ok ? '#00ff88' : '#ff4444', fontSize: 10, width: 14, textAlign: 'center' }}>{m.ok ? '✓' : '✗'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── EXECUTION CONDITIONS + TERMINAL ANALYSIS ──────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>

          {/* Execution Window */}
          <div style={{ background: '#080f1a', border: '1px solid #1a2a3a', borderTop: `2px solid ${scoreColor(ews)}`, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>EXECUTION WINDOW</div>
                <div style={{ fontSize: 9, color: '#3a5070', marginTop: 3 }}>Are setups actually working?</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MiniCircle score={ews} />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor(ews) }}>{ews.toFixed(0)}</div>
                  <div style={{ fontSize: 9, color: '#3a5070' }}>/ 100</div>
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: '#111d2d' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.execution_conditions.map((ec, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: '#4a6080', fontSize: 10, flex: 1, lineHeight: 1.4 }}>{ec.label}</span>
                  <span style={{ color: ec.ok ? '#00ff88' : '#ff4444', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{ec.ok ? '✓ YES' : '✗ NO'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal Analysis */}
          <div style={{ background: '#080f1a', border: '1px solid #1a2a3a', borderTop: '2px solid #2a88ff', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>TERMINAL ANALYSIS</span>
              <span style={{ fontSize: 9, padding: '2px 8px', background: '#2a88ff22', color: '#2a88ff', border: '1px solid #2a88ff44' }}>LIVE OUTPUT</span>
            </div>
            <div style={{ background: '#040b14', border: '1px solid #0d1a28', padding: '12px', overflowX: 'auto' }}>
              {d.terminal_analysis.map((line, i) => (
                <div key={i} style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8, color: terminalColor(line.type), whiteSpace: 'pre' }}>
                  {line.text || '\u00A0'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── DECISION LEGEND ──────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {([
            { dec: 'YES' as Decision, range: '80–100', action: 'Full position sizing. Press risk.' },
            { dec: 'CAUTION' as Decision, range: '60–79', action: 'Half size. A+ setups only.' },
            { dec: 'NO' as Decision, range: '0–59', action: 'Stay flat. Preserve capital.' },
          ]).map(({ dec, range, action }) => {
            const c = decisionConfig(dec);
            const active = d.decision === dec;
            return (
              <div key={dec} style={{ background: active ? c.bg : '#080f1a', border: `1px solid ${active ? c.border : '#1a2a3a'}`, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', transition: 'all 0.3s', boxShadow: active ? c.glow : 'none' }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: c.text, width: 64, flexShrink: 0 }}>{dec}</span>
                <div>
                  <div style={{ fontSize: 9, color: '#3a5070' }}>Score {range}</div>
                  <div style={{ fontSize: 10, color: active ? c.text : '#4a6080' }}>{action}</div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
