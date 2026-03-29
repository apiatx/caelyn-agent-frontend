import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Decision = 'YES' | 'CAUTION' | 'NO';
type Interpretation = 'healthy' | 'weakening' | 'risk-off' | 'elevated' | 'extreme';
type Direction = 'up' | 'down' | 'flat';
type Mode = 'swing' | 'day';

interface TickerItem { symbol: string; price: number; change: number; changePct: number; }
interface SectorPerformance { ticker: string; name: string; changePct: number; score: number; direction: Direction; }
interface PillarScore { score: number; weight: number; direction: Direction; interpretation: Interpretation; label: string; }

interface TradingDashboardData {
  decision: Decision;
  marketQualityScore: number;
  executionWindowScore: number;
  mode: Mode;
  pillars: { volatility: PillarScore; trend: PillarScore; breadth: PillarScore; momentum: PillarScore; macro: PillarScore; };
  ticker: { spy: TickerItem; qqq: TickerItem; vix: TickerItem; dxy: TickerItem; tnx: TickerItem; sectors: TickerItem[]; };
  volatility: { vix: { value: number; trend5d: number; percentile1yr: number }; vvix: number | null; interpretation: Interpretation; direction: Direction; score: number; };
  trend: { spy: { price: number; ma20: number; ma50: number; ma200: number }; qqq: { price: number; ma50: number }; rsi14: number; regime: string; direction: Direction; interpretation: Interpretation; score: number; };
  breadth: { pctAbove20d: number; pctAbove50d: number; pctAbove200d: number; nyseAdvDecRatio: number; nasdaqNewHighs: number; nasdaqNewLows: number; mcclellan: number | null; direction: Direction; interpretation: Interpretation; score: number; };
  momentum: { sectors: SectorPerformance[]; leaderCount: number; laggardCount: number; direction: Direction; interpretation: Interpretation; score: number; };
  macro: { tnx: { value: number; trend: Direction }; dxy: { value: number; trend: Direction }; fedStance: string; fomcWithin72h: boolean; fomcEventDate: string | null; cpiFlag: boolean; jobsFlag: boolean; direction: Direction; interpretation: Interpretation; score: number; };
  executionWindow: { breakoutsHolding: boolean; leadersGainingPostBreakout: boolean; pullbacksBought: boolean; multiDayFollowThrough: boolean; score: number; };
  alerts: Array<{ type: string; message: string; severity: 'warning' | 'danger' | 'info' }>;
  terminalAnalysis: string;
  lastUpdated: string;
  status: 'LIVE' | 'UPDATING' | 'STALE';
}

const fetchDashboard = async (mode: Mode): Promise<TradingDashboardData> => {
  const res = await fetch(`/api/trading-dashboard?mode=${mode}`);
  if (!res.ok) throw new Error('Failed to fetch dashboard data');
  return res.json();
};

const refreshDashboard = async (mode: Mode): Promise<TradingDashboardData> => {
  const res = await fetch(`/api/trading-dashboard/refresh?mode=${mode}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh dashboard');
  return res.json();
};

function dir(d: Direction) {
  if (d === 'up') return '↑';
  if (d === 'down') return '↓';
  return '→';
}

function interpretColor(i: Interpretation) {
  if (i === 'healthy') return '#00ff88';
  if (i === 'weakening') return '#ffbb00';
  return '#ff4444';
}

function scoreColor(s: number) {
  if (s >= 70) return '#00ff88';
  if (s >= 50) return '#ffbb00';
  return '#ff4444';
}

function changePctColor(v: number) {
  if (v > 0) return '#00ff88';
  if (v < 0) return '#ff4444';
  return '#8899aa';
}

function decisionColors(d: Decision) {
  if (d === 'YES') return { bg: '#00ff8822', border: '#00ff88', text: '#00ff88', glow: '0 0 32px #00ff8866' };
  if (d === 'CAUTION') return { bg: '#ffbb0022', border: '#ffbb00', text: '#ffbb00', glow: '0 0 32px #ffbb0066' };
  return { bg: '#ff444422', border: '#ff4444', text: '#ff4444', glow: '0 0 32px #ff444466' };
}

function CircleScore({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a2233" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

function SmallCircle({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a2233" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

function TickerTape({ data }: { data: TradingDashboardData }) {
  const items = [
    data.ticker.spy, data.ticker.qqq, data.ticker.vix, data.ticker.dxy, data.ticker.tnx,
    ...data.ticker.sectors.slice(0, 6),
  ];
  const doubled = [...items, ...items];

  return (
    <div style={{ overflow: 'hidden', background: '#050c18', borderBottom: '1px solid #1a2a3a', position: 'relative' }}>
      <div style={{ display: 'flex', animation: 'tickerScroll 40s linear infinite', whiteSpace: 'nowrap', width: 'max-content' }}>
        {doubled.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 24px', fontFamily: 'monospace', fontSize: 11 }}>
            <span style={{ color: '#8899cc', letterSpacing: 1 }}>{t.symbol}</span>
            <span style={{ color: '#ccdeff' }}>{t.price > 0 ? t.price.toFixed(t.symbol === 'TNX' ? 2 : 2) : '--'}</span>
            <span style={{ color: changePctColor(t.changePct) }}>
              {t.changePct >= 0 ? '+' : ''}{t.changePct.toFixed(2)}%
            </span>
            <span style={{ color: '#2a3a4a', marginLeft: 8 }}>│</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

function PillarPanel({ label, pillar, children }: { label: string; pillar: PillarScore; children: React.ReactNode }) {
  const iColor = interpretColor(pillar.interpretation);
  return (
    <div style={{ background: '#080f1a', border: '1px solid #1a2a3a', borderTop: `2px solid ${iColor}`, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4a6080', letterSpacing: 2, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#3a5070', marginTop: 2 }}>Weight: {pillar.weight}%</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SmallCircle score={pillar.score} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: scoreColor(pillar.score) }}>{pillar.score}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: iColor }}>{pillar.interpretation.toUpperCase()}</div>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', height: 1, background: '#111d2d' }} />
      {children}
    </div>
  );
}

function DataRow({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontSize: 11 }}>
      <span style={{ color: '#4a6080' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ color: highlight || '#8899cc' }}>{value}</span>
        {sub && <div style={{ fontSize: 9, color: '#3a5070' }}>{sub}</div>}
      </div>
    </div>
  );
}

function BoolCheck({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 11 }}>
      <span style={{ color: '#4a6080' }}>{label}</span>
      <span style={{ color: value ? '#00ff88' : '#ff4444' }}>{value ? '✓ YES' : '✗ NO'}</span>
    </div>
  );
}

function SectorBar({ sector, maxAbs }: { sector: SectorPerformance; maxAbs: number }) {
  const pct = sector.changePct;
  const barWidth = Math.abs(pct) / maxAbs * 100;
  const color = pct > 0 ? '#00ff88' : pct < 0 ? '#ff4444' : '#8899aa';
  const scoreC = scoreColor(sector.score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 10 }}>
      <span style={{ color: '#4a6080', width: 42, flexShrink: 0 }}>{sector.ticker}</span>
      <span style={{ color: '#6a80a0', width: 88, flexShrink: 0, fontSize: 9 }}>{sector.name}</span>
      <div style={{ flex: 1, height: 10, background: '#0d1a28', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', [pct >= 0 ? 'left' : 'right']: '50%', top: 0, width: `${barWidth / 2}%`, height: '100%', background: color, borderRadius: 2, filter: `drop-shadow(0 0 3px ${color})` }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: '#1a2a3a' }} />
      </div>
      <span style={{ color, width: 44, textAlign: 'right', flexShrink: 0 }}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</span>
      <span style={{ color: scoreC, width: 28, textAlign: 'right', flexShrink: 0 }}>{sector.score}</span>
    </div>
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
  });

  const refresh = useMutation({
    mutationFn: () => refreshDashboard(mode),
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

  const handleRefresh = useCallback(() => {
    refresh.mutate();
  }, [mode]);

  const handleModeToggle = (m: Mode) => {
    setMode(m);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#030810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ textAlign: 'center', color: '#4a6080' }}>
          <div style={{ fontSize: 14, letterSpacing: 4, color: '#2a88ff', marginBottom: 12 }}>LOADING MARKET DATA</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a88ff', animation: `pulse 1s ${i * 0.3}s infinite` }} />)}
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:0.2}50%{opacity:1} }`}</style>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#030810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ textAlign: 'center', color: '#ff4444' }}>
          <div style={{ fontSize: 14 }}>⚠ FAILED TO LOAD MARKET DATA</div>
          <button onClick={handleRefresh} style={{ marginTop: 16, padding: '8px 20px', background: '#1a2a3a', border: '1px solid #2a88ff', color: '#2a88ff', fontFamily: 'monospace', cursor: 'pointer', fontSize: 12 }}>RETRY</button>
        </div>
      </div>
    );
  }

  const d = data;
  const dc = decisionColors(d.decision);
  const allSectors = d.momentum.sectors;
  const maxAbs = Math.max(...allSectors.map(s => Math.abs(s.changePct)), 1);

  const spyVsMAs = d.trend.spy.price > d.trend.spy.ma20 && d.trend.spy.price > d.trend.spy.ma50 && d.trend.spy.price > d.trend.spy.ma200;

  return (
    <div style={{ minHeight: '100vh', background: '#030810', color: '#ccdeff', fontFamily: 'monospace', fontSize: 12 }}>

      {/* Top Bar */}
      <div style={{ background: '#050c18', borderBottom: '1px solid #1a2a3a', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2a88ff', letterSpacing: 2 }}>SHOULD I BE TRADING?</span>
          <span style={{ fontSize: 9, background: d.status === 'LIVE' ? '#00ff8822' : '#ffbb0022', color: d.status === 'LIVE' ? '#00ff88' : '#ffbb00', border: `1px solid ${d.status === 'LIVE' ? '#00ff8844' : '#ffbb0044'}`, padding: '2px 8px', letterSpacing: 2 }}>● {d.status}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10 }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', border: '1px solid #1a2a3a', overflow: 'hidden' }}>
            {(['swing', 'day'] as Mode[]).map(m => (
              <button key={m} onClick={() => handleModeToggle(m)}
                style={{ padding: '4px 14px', background: mode === m ? '#1a3a5a' : 'transparent', color: mode === m ? '#2a88ff' : '#4a6080', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', transition: 'all 0.2s' }}>
                {m}
              </button>
            ))}
          </div>

          <span style={{ color: '#3a5070' }}>Updated: <span style={{ color: '#6a8090' }}>{new Date(d.lastUpdated).toLocaleTimeString()}</span></span>
          <span style={{ color: '#3a5070' }}>Refresh in: <span style={{ color: timeLeft < 10 ? '#ffbb00' : '#6a8090' }}>{timeLeft}s</span></span>
          <button onClick={handleRefresh} disabled={refresh.isPending}
            style={{ padding: '4px 14px', background: '#0a1828', border: '1px solid #2a88ff', color: '#2a88ff', fontFamily: 'monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1, opacity: refresh.isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            {refresh.isPending ? 'UPDATING...' : '↻ REFRESH'}
          </button>
        </div>
      </div>

      {/* Ticker Tape */}
      <TickerTape data={d} />

      {/* Alert Banner */}
      {(d.macro.fomcWithin72h || d.macro.cpiFlag || d.macro.jobsFlag || d.alerts.length > 0) && (
        <div style={{ background: '#1a0800', borderBottom: '1px solid #ff440033', padding: '6px 16px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#ff8844', fontSize: 10, letterSpacing: 2 }}>⚠ MACRO ALERT</span>
          {d.macro.fomcWithin72h && <span style={{ color: '#ff4444', fontSize: 10 }}>FOMC WITHIN 72H — REDUCE EXPOSURE</span>}
          {d.macro.cpiFlag && <span style={{ color: '#ffbb00', fontSize: 10 }}>CPI DATA IMMINENT</span>}
          {d.macro.jobsFlag && <span style={{ color: '#ffbb00', fontSize: 10 }}>JOBS REPORT IMMINENT</span>}
          {d.alerts.map((a, i) => <span key={i} style={{ color: a.severity === 'danger' ? '#ff4444' : a.severity === 'warning' ? '#ffbb00' : '#8899cc', fontSize: 10 }}>{a.message}</span>)}
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* HERO ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>

          {/* Hero Decision Panel */}
          <div style={{ background: '#080f1a', border: `1px solid ${dc.border}`, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: dc.glow, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: '#4a6080', textAlign: 'center' }}>SHOULD I TRADE TODAY?</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircleScore score={d.marketQualityScore} size={140} />
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: dc.text, letterSpacing: 2, lineHeight: 1 }}>{d.decision}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: dc.text, lineHeight: 1, marginTop: 2 }}>{d.marketQualityScore}</div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: '#4a6080', textAlign: 'center', letterSpacing: 2 }}>MARKET QUALITY SCORE</div>
            <div style={{ width: '100%', height: 1, background: '#1a2a3a' }} />
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span style={{ color: '#4a6080' }}>EXEC WINDOW</span>
              <span style={{ color: scoreColor(d.executionWindowScore) }}>{d.executionWindowScore}/100</span>
            </div>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span style={{ color: '#4a6080' }}>MODE</span>
              <span style={{ color: '#2a88ff' }}>{d.mode.toUpperCase()} TRADING</span>
            </div>
            <div style={{ fontSize: 9, color: '#3a5070', textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
              {d.decision === 'YES' && '✓ Full size. Press risk on A+ setups.'}
              {d.decision === 'CAUTION' && '⚡ Half size. A+ setups only.'}
              {d.decision === 'NO' && '✗ Avoid trading. Preserve capital.'}
            </div>
          </div>

          {/* Scoring Breakdown */}
          <div style={{ background: '#080f1a', border: '1px solid #1a2a3a', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: '#4a6080', marginBottom: 4 }}>SCORING BREAKDOWN</div>
            {Object.entries(d.pillars).map(([key, p]) => {
              const pc = p as PillarScore;
              const barPct = pc.score;
              const color = scoreColor(pc.score);
              const iColor = interpretColor(pc.interpretation);
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#4a6080', fontSize: 10, width: 130, flexShrink: 0 }}>{pc.label}</span>
                  <span style={{ color: '#3a5070', fontSize: 9, width: 30, flexShrink: 0 }}>×{pc.weight}%</span>
                  <div style={{ flex: 1, height: 12, background: '#0a1520', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 2, filter: `drop-shadow(0 0 3px ${color})`, transition: 'width 0.8s ease' }} />
                  </div>
                  <span style={{ color, fontSize: 11, fontWeight: 700, width: 28, textAlign: 'right', flexShrink: 0 }}>{pc.score}</span>
                  <span style={{ color: iColor, fontSize: 9, width: 60, flexShrink: 0 }}>{pc.interpretation.toUpperCase()}</span>
                  <span style={{ color: dir(pc.direction) === '↑' ? '#00ff88' : dir(pc.direction) === '↓' ? '#ff4444' : '#8899aa', fontSize: 12, width: 12 }}>{dir(pc.direction)}</span>
                </div>
              );
            })}

            <div style={{ height: 1, background: '#1a2a3a', margin: '4px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#6a8090', fontSize: 10, width: 130, flexShrink: 0, fontWeight: 700 }}>COMPOSITE SCORE</span>
              <span style={{ color: '#3a5070', fontSize: 9, width: 30, flexShrink: 0 }}>total</span>
              <div style={{ flex: 1, height: 14, background: '#0a1520', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${d.marketQualityScore}%`, background: `linear-gradient(90deg, ${scoreColor(d.marketQualityScore)}, ${scoreColor(d.marketQualityScore)}88)`, borderRadius: 2, transition: 'width 0.8s ease' }} />
              </div>
              <span style={{ color: scoreColor(d.marketQualityScore), fontSize: 13, fontWeight: 900, width: 28, textAlign: 'right', flexShrink: 0 }}>{d.marketQualityScore}</span>
              <span style={{ color: dc.text, fontSize: 9, width: 60, flexShrink: 0, fontWeight: 700 }}>{d.decision}</span>
              <span style={{ width: 12 }} />
            </div>
          </div>
        </div>

        {/* CORE PANELS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>

          {/* Volatility Panel */}
          <PillarPanel label="1. VOLATILITY / RISK" pillar={d.pillars.volatility}>
            <DataRow label="VIX Level" value={d.volatility.vix.value.toFixed(2)} highlight={d.volatility.vix.value > 30 ? '#ff4444' : d.volatility.vix.value > 20 ? '#ffbb00' : '#00ff88'} />
            <DataRow label="VIX 5-Day Slope" value={`${d.volatility.vix.trend5d > 0 ? '+' : ''}${d.volatility.vix.trend5d.toFixed(2)}`} highlight={changePctColor(-d.volatility.vix.trend5d)} />
            <DataRow label="VIX 1-Yr Percentile" value={`${d.volatility.vix.percentile1yr}th`} sub="lower = calmer" highlight={d.volatility.vix.percentile1yr < 40 ? '#00ff88' : d.volatility.vix.percentile1yr < 70 ? '#ffbb00' : '#ff4444'} />
            {d.volatility.vvix !== null && <DataRow label="VVIX" value={d.volatility.vvix.toFixed(1)} highlight={d.volatility.vvix > 110 ? '#ff4444' : '#8899cc'} />}
            <div style={{ marginTop: 4, padding: '6px 8px', background: '#0a1520', border: `1px solid ${interpretColor(d.volatility.interpretation)}22`, borderRadius: 2, fontSize: 9, color: interpretColor(d.volatility.interpretation) }}>
              {dir(d.volatility.direction)} VIX is {d.volatility.interpretation === 'healthy' ? 'contained — risk environment is favorable' : d.volatility.interpretation === 'elevated' ? 'elevated — reduce size, tighter stops' : 'extreme — stay in cash, market unstable'}
            </div>
          </PillarPanel>

          {/* Trend Panel */}
          <PillarPanel label="2. TREND & STRUCTURE" pillar={d.pillars.trend}>
            <DataRow label="SPY" value={`$${d.trend.spy.price.toFixed(2)}`} highlight="#ccdeff" />
            <DataRow label="SPY vs 20/50/200 MA" value={spyVsMAs ? 'ABOVE ALL' : 'MIXED'} highlight={spyVsMAs ? '#00ff88' : '#ffbb00'} />
            <DataRow label="SPY MA20 / MA50 / MA200" value={`${d.trend.spy.ma20.toFixed(0)} / ${d.trend.spy.ma50.toFixed(0)} / ${d.trend.spy.ma200.toFixed(0)}`} highlight="#4a6080" />
            <DataRow label="QQQ vs MA50" value={d.trend.qqq.price > d.trend.qqq.ma50 ? `+${((d.trend.qqq.price / d.trend.qqq.ma50 - 1) * 100).toFixed(1)}%` : `${((d.trend.qqq.price / d.trend.qqq.ma50 - 1) * 100).toFixed(1)}%`} highlight={d.trend.qqq.price > d.trend.qqq.ma50 ? '#00ff88' : '#ff4444'} />
            <DataRow label="RSI-14 (SPY)" value={d.trend.rsi14.toFixed(1)} highlight={d.trend.rsi14 > 70 ? '#ff4444' : d.trend.rsi14 < 30 ? '#00ff88' : '#8899cc'} sub="30=oversold  70=overbought" />
            <DataRow label="Market Regime" value={d.trend.regime.toUpperCase()} highlight={d.trend.regime === 'uptrend' ? '#00ff88' : d.trend.regime === 'downtrend' ? '#ff4444' : '#ffbb00'} />
          </PillarPanel>

          {/* Breadth Panel */}
          <PillarPanel label="3. MARKET BREADTH" pillar={d.pillars.breadth}>
            <DataRow label="% Above 20-Day MA" value={`${d.breadth.pctAbove20d}%`} highlight={d.breadth.pctAbove20d > 60 ? '#00ff88' : d.breadth.pctAbove20d > 40 ? '#ffbb00' : '#ff4444'} />
            <DataRow label="% Above 50-Day MA" value={`${d.breadth.pctAbove50d}%`} highlight={d.breadth.pctAbove50d > 60 ? '#00ff88' : d.breadth.pctAbove50d > 40 ? '#ffbb00' : '#ff4444'} />
            <DataRow label="% Above 200-Day MA" value={`${d.breadth.pctAbove200d}%`} highlight={d.breadth.pctAbove200d > 60 ? '#00ff88' : d.breadth.pctAbove200d > 40 ? '#ffbb00' : '#ff4444'} />
            <DataRow label="NYSE A/D Ratio" value={d.breadth.nyseAdvDecRatio.toFixed(2)} highlight={d.breadth.nyseAdvDecRatio > 1.5 ? '#00ff88' : d.breadth.nyseAdvDecRatio > 1 ? '#ffbb00' : '#ff4444'} sub="advances ÷ declines" />
            <DataRow label="NASDAQ New Hi / Lo" value={`${d.breadth.nasdaqNewHighs} / ${d.breadth.nasdaqNewLows}`} highlight={d.breadth.nasdaqNewHighs > d.breadth.nasdaqNewLows ? '#00ff88' : '#ff4444'} />
            {d.breadth.mcclellan !== null && <DataRow label="McClellan Oscillator" value={d.breadth.mcclellan.toFixed(1)} highlight={d.breadth.mcclellan > 0 ? '#00ff88' : '#ff4444'} sub=">0 bullish  <0 bearish" />}
          </PillarPanel>

          {/* Macro Panel */}
          <PillarPanel label="5. MACRO / LIQUIDITY" pillar={d.pillars.macro}>
            <DataRow label="10-Yr Yield (TNX)" value={`${d.macro.tnx.value.toFixed(2)}%`} highlight={d.macro.tnx.value > 4.5 ? '#ff4444' : '#8899cc'} sub={`Trend: ${dir(d.macro.tnx.trend)}`} />
            <DataRow label="Dollar Index (DXY)" value={d.macro.dxy.value.toFixed(2)} highlight={d.macro.dxy.trend === 'up' ? '#ff4444' : '#00ff88'} sub={`Trend: ${dir(d.macro.dxy.trend)}`} />
            <DataRow label="Fed Stance" value={d.macro.fedStance.toUpperCase()} highlight={d.macro.fedStance === 'dovish' ? '#00ff88' : d.macro.fedStance === 'neutral' ? '#ffbb00' : '#ff4444'} />
            <DataRow label="Next FOMC" value={d.macro.fomcEventDate || 'Unknown'} highlight={d.macro.fomcWithin72h ? '#ff4444' : '#8899cc'} sub={d.macro.fomcWithin72h ? '⚠ WITHIN 72H' : undefined} />
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <div style={{ flex: 1, padding: '4px 8px', background: '#0a1520', border: `1px solid ${d.macro.cpiFlag ? '#ff444433' : '#1a2a3a'}`, fontSize: 9, color: d.macro.cpiFlag ? '#ff4444' : '#3a5070', textAlign: 'center' }}>CPI {d.macro.cpiFlag ? '⚠ IMMINENT' : '● CLEAR'}</div>
              <div style={{ flex: 1, padding: '4px 8px', background: '#0a1520', border: `1px solid ${d.macro.jobsFlag ? '#ff444433' : '#1a2a3a'}`, fontSize: 9, color: d.macro.jobsFlag ? '#ff4444' : '#3a5070', textAlign: 'center' }}>JOBS {d.macro.jobsFlag ? '⚠ IMMINENT' : '● CLEAR'}</div>
            </div>
          </PillarPanel>
        </div>

        {/* MOMENTUM + EXECUTION ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>

          {/* Sector Heatmap */}
          <div style={{ background: '#080f1a', border: '1px solid #1a2a3a', borderTop: `2px solid ${interpretColor(d.pillars.momentum.interpretation)}`, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>4. MOMENTUM / SECTOR PARTICIPATION</div>
                <div style={{ fontSize: 9, color: '#3a5070', marginTop: 2 }}>Weight: {d.pillars.momentum.weight}% · All 11 S&P 500 Sector ETFs</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SmallCircle score={d.momentum.score} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(d.momentum.score), textAlign: 'right' }}>{d.momentum.score}</div>
                  <div style={{ fontSize: 9, color: interpretColor(d.pillars.momentum.interpretation) }}>{d.pillars.momentum.interpretation.toUpperCase()}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 9 }}>
              <span style={{ color: '#4a6080' }}>Leaders (score≥65): <span style={{ color: '#00ff88' }}>{d.momentum.leaderCount}</span></span>
              <span style={{ color: '#4a6080' }}>Laggards (score&lt;45): <span style={{ color: '#ff4444' }}>{d.momentum.laggardCount}</span></span>
              <span style={{ color: '#4a6080' }}>Bar = daily % · Right = score</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...allSectors].sort((a, b) => b.changePct - a.changePct).map(s => (
                <SectorBar key={s.ticker} sector={s} maxAbs={maxAbs} />
              ))}
            </div>
          </div>

          {/* Execution Window */}
          <div style={{ background: '#080f1a', border: '1px solid #1a2a3a', borderTop: `2px solid ${scoreColor(d.executionWindowScore)}`, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>EXECUTION WINDOW</div>
                <div style={{ fontSize: 9, color: '#3a5070', marginTop: 2 }}>Setups actually working?</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SmallCircle score={d.executionWindowScore} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(d.executionWindowScore) }}>{d.executionWindowScore}</div>
                  <div style={{ fontSize: 9, color: '#3a5070' }}>/ 100</div>
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: '#111d2d' }} />
            <BoolCheck label="Breakouts holding pivots?" value={d.executionWindow.breakoutsHolding} />
            <BoolCheck label="Leaders gaining post-BO?" value={d.executionWindow.leadersGainingPostBreakout} />
            <BoolCheck label="Pullbacks being bought?" value={d.executionWindow.pullbacksBought} />
            <BoolCheck label="Multi-day follow-through?" value={d.executionWindow.multiDayFollowThrough} />
            <div style={{ height: 1, background: '#111d2d' }} />
            <div style={{ fontSize: 9, color: '#3a5070', lineHeight: 1.6 }}>
              Execution window score supplements the Market Quality Score. Low execution score = even good setups may not follow through.
            </div>
          </div>
        </div>

        {/* Terminal Analysis */}
        <div style={{ background: '#080f1a', border: '1px solid #1a2a3a', borderTop: '2px solid #2a88ff', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>TERMINAL ANALYSIS</div>
            <div style={{ fontSize: 9, background: '#2a88ff22', color: '#2a88ff', border: '1px solid #2a88ff44', padding: '2px 8px' }}>AI LAYER</div>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#8899cc', lineHeight: 1.8, borderLeft: '2px solid #2a88ff44', paddingLeft: 12 }}>
            {d.terminalAnalysis}
          </div>
        </div>

        {/* Decision Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {([
            { d: 'YES' as Decision, range: '80–100', action: 'Full position sizing. Press risk.' },
            { d: 'CAUTION' as Decision, range: '60–79', action: 'Half size. A+ setups only.' },
            { d: 'NO' as Decision, range: '0–59', action: 'Avoid trading. Preserve capital.' },
          ]).map(({ d: dec, range, action }) => {
            const c = decisionColors(dec);
            const isActive = d.decision === dec;
            return (
              <div key={dec} style={{ background: isActive ? c.bg : '#080f1a', border: `1px solid ${isActive ? c.border : '#1a2a3a'}`, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', transition: 'all 0.3s' }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: c.text, width: 60, flexShrink: 0 }}>{dec}</span>
                <div>
                  <div style={{ fontSize: 9, color: '#3a5070' }}>Score {range}</div>
                  <div style={{ fontSize: 10, color: isActive ? c.text : '#4a6080' }}>{action}</div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
