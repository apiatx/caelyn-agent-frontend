import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, Send, Loader2, TrendingUp, Activity, Zap, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

const AGENT_BACKEND_URL = "https://fast-api-server-trading-agent-aidanpilon.replit.app";
const AGENT_API_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";

function getToken(): string | null {
  return localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
}
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY, ...extra };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

const C = {
  bg: '#050510',
  card: '#08080f',
  cardAlt: '#0c0c1a',
  border: '#1a1a30',
  bright: '#e2e8f0',
  text: '#94a3b8',
  dim: '#475569',
  blue: '#38bdf8',
  green: '#4ade80',
  red: '#ef4444',
  yellow: '#fbbf24',
  orange: '#f97316',
  purple: '#a855f7',
  gold: '#f59e0b',
};
const font = "'JetBrains Mono', 'Fira Code', monospace";
const sans = "'Outfit', 'Inter', sans-serif";

// ─── Color helpers ─────────────────────────────────────────────────────────────
function sideColor(side: string) { return side?.toLowerCase() === 'call' ? C.green : C.red; }
function convictionColor(c: string) {
  if (!c) return C.dim;
  const l = c.toLowerCase();
  if (l === 'high') return C.green;
  if (l === 'medium') return C.yellow;
  return '#6b7280';
}
function sentimentColor(s: string) {
  if (!s) return C.dim;
  const l = s.toLowerCase();
  if (l === 'bullish') return C.green;
  if (l === 'bearish') return C.red;
  if (l === 'mixed') return C.yellow;
  return C.dim;
}
function ivEnvColor(iv: string) {
  if (!iv) return C.dim;
  const l = iv.toLowerCase();
  if (l === 'elevated') return C.red;
  if (l === 'depressed') return C.blue;
  return '#6b7280';
}
function volOiColor(ratio: number) {
  if (ratio > 10) return C.red;
  if (ratio > 5) return C.orange;
  if (ratio > 3) return C.yellow;
  return '#6b7280';
}
function ivPctColor(pct: number) {
  if (pct > 80) return C.red;
  if (pct > 50) return C.yellow;
  if (pct < 30) return C.blue;
  return C.dim;
}

// ─── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: `${color}18`, color, border: `1px solid ${color}35`, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </span>
  );
}

// ─── TradingView Chart ──────────────────────────────────────────────────────────
function TVChart({ symbol, interval = 'D' }: { symbol: string; interval?: string }) {
  const [ivl, setIvl] = useState(interval);
  const ivls = [{ l: '1H', v: '60' }, { l: '4H', v: '240' }, { l: '1D', v: 'D' }, { l: '1W', v: 'W' }, { l: '1M', v: 'M' }];
  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {ivls.map(iv => (
          <button key={iv.v} onClick={(e) => { e.stopPropagation(); setIvl(iv.v); }}
            style={{ padding: '2px 8px', fontSize: 9, fontWeight: 600, fontFamily: font, background: ivl === iv.v ? `${C.blue}20` : 'transparent', color: ivl === iv.v ? C.blue : C.dim, border: `1px solid ${ivl === iv.v ? C.blue + '40' : C.border}`, borderRadius: 3, cursor: 'pointer' }}>
            {iv.l}
          </button>
        ))}
      </div>
      <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <iframe
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=${ivl}&theme=dark&style=1&locale=en&hide_top_toolbar=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=220`}
          style={{ width: '100%', height: 220, border: 'none', display: 'block' }}
          title={`${symbol} chart`}
        />
      </div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ h = 20, w = '100%', mb = 8 }: { h?: number; w?: string | number; mb?: number }) {
  return <div style={{ height: h, width: w, background: `${C.border}80`, borderRadius: 4, marginBottom: mb, animation: 'pulse 1.5s ease-in-out infinite' }} />;
}
function SectionSkeleton() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <Skeleton h={14} w={120} mb={12} />
      {[1, 2, 3].map(i => <Skeleton key={i} h={52} mb={8} />)}
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
function LoadingProgress({ stage }: { stage: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: C.blue, fontSize: 13, fontFamily: font, fontWeight: 600 }}>{stage}</div>
      <div style={{ color: C.dim, fontSize: 11, fontFamily: sans }}>Options flow analysis takes 10–15s</div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
type Tab = 'unusual' | 'conviction' | 'iv' | 'context';

export default function OptionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadStage, setLoadStage] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('unusual');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDashboard = useCallback(async (tickers: string[] | null = null) => {
    setLoading(true);
    setError('');
    setExpandedTicker(null);
    const stages = [
      'Scanning 15 tickers...',
      'Pulling options chains...',
      'Detecting unusual activity...',
      'Analyzing flow with Claude...',
      'Finalizing...',
    ];
    let si = 0;
    setLoadStage(stages[0]);
    const stageTimer = setInterval(() => {
      si = Math.min(si + 1, stages.length - 1);
      setLoadStage(stages[si]);
    }, 2800);

    try {
      const res = await fetch('/api/options/dashboard', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load options dashboard');
    } finally {
      clearInterval(stageTimer);
      setLoading(false);
      setLoadStage('');
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    intervalRef.current = setInterval(() => fetchDashboard(), 120_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchDashboard]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const askAgent = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const q = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          query: q,
          preset_intent: 'options_flow',
          context_data: data,
          conversation_id: null,
          reasoning_model: 'claude',
        }),
      });
      const json = await res.json();
      const text = json.analysis || json.response?.analysis || json.structured?.summary || json.text || 'No response.';
      setChatMessages(prev => [...prev, { role: 'ai', text }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'ai', text: `Error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ─── Extract response sections ───────────────────────────────────────────────
  const resp = data?.response || data;
  const marketCtx = resp?.market_context || {};
  const unusualActivity: any[] = resp?.unusual_activity || [];
  const convictionPlays: any[] = resp?.conviction_plays || [];
  const ivHeatmap: any[] = resp?.iv_heatmap || resp?.iv_heat_map || [];
  const timing = data?.timing || resp?.timing;
  const scannedCount = resp?.tickers_scanned ?? unusualActivity.length + convictionPlays.length;

  // ─── Tabs ────────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'context', label: 'Market Context', icon: <Activity className="w-3 h-3" /> },
    { id: 'unusual', label: 'Unusual Activity', icon: <Zap className="w-3 h-3" />, count: unusualActivity.length || undefined },
    { id: 'conviction', label: 'Conviction Plays', icon: <TrendingUp className="w-3 h-3" />, count: convictionPlays.length || undefined },
    { id: 'iv', label: 'IV Heat Map', icon: <BarChart3 className="w-3 h-3" />, count: ivHeatmap.length || undefined },
  ];

  // ─── Unusual Activity row ─────────────────────────────────────────────────────
  function UnusualRow({ item, idx }: { item: any; idx: number }) {
    const key = `ua-${idx}`;
    const isExp = expandedTicker === key;
    const volOi = item.volume_oi_ratio ?? item.vol_oi_ratio ?? (item.volume && item.open_interest ? (item.volume / item.open_interest) : null);
    const ivPct = item.iv_percentile ?? item.iv_rank;
    const tvSym = item.tradingview_symbol || item.ticker;

    return (
      <div
        onClick={() => setExpandedTicker(isExp ? null : key)}
        style={{ background: C.card, border: `1px solid ${isExp ? C.blue + '30' : C.border}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}
      >
        {/* Header row */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {item.rank && <span style={{ color: C.dim, fontSize: 10, fontFamily: font, minWidth: 18 }}>#{item.rank}</span>}
            <span style={{ color: C.bright, fontWeight: 800, fontSize: 15, fontFamily: font }}>{item.ticker}</span>
            <Badge color={sideColor(item.side)}>{item.side || '—'}</Badge>
            {item.contract && <span style={{ color: C.text, fontSize: 11, fontFamily: font }}>{item.contract}</span>}
            {item.expiry && !item.contract && <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>Exp: {item.expiry}</span>}
            {item.strike && <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>Strike: ${item.strike}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {item.conviction && <Badge color={convictionColor(item.conviction)}>{item.conviction}</Badge>}
            {volOi != null && <span style={{ color: volOiColor(volOi), fontSize: 11, fontFamily: font, fontWeight: 700 }}>V/OI {typeof volOi === 'number' ? volOi.toFixed(1) : volOi}×</span>}
            {ivPct != null && <span style={{ color: ivPctColor(Number(ivPct)), fontSize: 11, fontFamily: font }}>IV% {ivPct}</span>}
            {isExp ? <ChevronUp className="w-3 h-3" style={{ color: C.dim }} /> : <ChevronDown className="w-3 h-3" style={{ color: C.dim }} />}
          </div>
        </div>
        {/* Stat row */}
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 16, fontSize: 11, fontFamily: font, color: C.dim, flexWrap: 'wrap' }}>
          {item.premium && <span>Premium: <span style={{ color: C.blue, fontWeight: 700 }}>{item.premium}</span></span>}
          {item.volume != null && <span>Vol: <span style={{ color: C.bright }}>{typeof item.volume === 'number' ? item.volume.toLocaleString() : item.volume}</span></span>}
          {item.open_interest != null && <span>OI: <span style={{ color: C.bright }}>{typeof item.open_interest === 'number' ? item.open_interest.toLocaleString() : item.open_interest}</span></span>}
          {item.implied_volatility != null && <span>IV: <span style={{ color: C.yellow }}>{item.implied_volatility}</span></span>}
          {item.delta != null && <span>Δ {item.delta}</span>}
          {item.gamma != null && <span>Γ {item.gamma}</span>}
        </div>
        {item.signal && <div style={{ padding: '0 16px 10px', color: C.text, fontSize: 12, fontFamily: sans, lineHeight: 1.6 }}>{item.signal}</div>}
        {/* Expanded chart */}
        {isExp && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
            {tvSym && <TVChart symbol={tvSym} />}
            {item.greeks && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginTop: 10 }}>
                {Object.entries(item.greeks).map(([k, v]: [string, any]) => (
                  <div key={k} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                    <div style={{ color: C.bright, fontSize: 13, fontWeight: 700, fontFamily: font }}>{v as string}</div>
                  </div>
                ))}
              </div>
            )}
            {item.analysis && <div style={{ marginTop: 10, padding: 10, background: `${C.blue}06`, border: `1px solid ${C.blue}15`, borderRadius: 8, color: C.text, fontSize: 11, fontFamily: sans, lineHeight: 1.6 }}><span style={{ color: C.blue, fontWeight: 700 }}>Analysis: </span>{item.analysis}</div>}
          </div>
        )}
      </div>
    );
  }

  // ─── Conviction Play row ───────────────────────────────────────────────────────
  function ConvictionRow({ item, idx }: { item: any; idx: number }) {
    const key = `cv-${idx}`;
    const isExp = expandedTicker === key;
    const tvSym = item.tradingview_symbol || item.ticker;

    return (
      <div
        onClick={() => setExpandedTicker(isExp ? null : key)}
        style={{ background: C.card, border: `1px solid ${isExp ? C.purple + '30' : C.border}`, borderLeft: `3px solid ${convictionColor(item.conviction)}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}
      >
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: C.bright, fontWeight: 800, fontSize: 15, fontFamily: font }}>{item.ticker}</span>
            {item.side && <Badge color={sideColor(item.side)}>{item.side}</Badge>}
            {item.contract && <span style={{ color: C.text, fontSize: 11, fontFamily: font }}>{item.contract}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {item.conviction && <Badge color={convictionColor(item.conviction)}>{item.conviction}</Badge>}
            {isExp ? <ChevronUp className="w-3 h-3" style={{ color: C.dim }} /> : <ChevronDown className="w-3 h-3" style={{ color: C.dim }} />}
          </div>
        </div>
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 14, fontSize: 11, fontFamily: font, color: C.dim, flexWrap: 'wrap' }}>
          {item.premium && <span>Premium: <span style={{ color: C.blue, fontWeight: 700 }}>{item.premium}</span></span>}
          {item.volume != null && <span>Vol: <span style={{ color: C.bright }}>{typeof item.volume === 'number' ? item.volume.toLocaleString() : item.volume}</span></span>}
          {item.implied_volatility != null && <span>IV: <span style={{ color: C.yellow }}>{item.implied_volatility}</span></span>}
          {item.expiry && <span>Exp: {item.expiry}</span>}
        </div>
        {item.thesis && <div style={{ padding: '0 16px 10px', color: C.text, fontSize: 12, fontFamily: sans, lineHeight: 1.6 }}>{item.thesis}</div>}
        {isExp && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
            {tvSym && <TVChart symbol={tvSym} />}
            {item.risk && <div style={{ padding: 10, background: `${C.red}06`, border: `1px solid ${C.red}12`, borderRadius: 8, marginBottom: 8, color: C.text, fontSize: 11, fontFamily: sans }}><span style={{ color: C.red, fontWeight: 700 }}>Risk: </span>{item.risk}</div>}
            {item.analysis && <div style={{ padding: 10, background: `${C.green}06`, border: `1px solid ${C.green}15`, borderRadius: 8, color: C.text, fontSize: 11, fontFamily: sans, lineHeight: 1.6 }}><span style={{ color: C.green, fontWeight: 700 }}>Analysis: </span>{item.analysis}</div>}
          </div>
        )}
      </div>
    );
  }

  // ─── IV Heat Map row ───────────────────────────────────────────────────────────
  function IVRow({ item }: { item: any }) {
    const ivPct = item.iv_percentile ?? item.iv_rank ?? item.iv_pct;
    const ivPctNum = Number(ivPct);
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: C.bright, fontWeight: 800, fontSize: 14, fontFamily: font }}>{item.ticker}</span>
          {item.sector && <span style={{ color: C.dim, fontSize: 11, fontFamily: sans }}>{item.sector}</span>}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {item.current_iv != null && <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>IV: <span style={{ color: C.yellow, fontWeight: 700 }}>{item.current_iv}</span></span>}
          {ivPct != null && (
            <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>
              Pct: <span style={{ color: ivPctColor(ivPctNum), fontWeight: 700 }}>{ivPct}
                {typeof ivPctNum === 'number' && !String(ivPct).includes('th') ? 'th' : ''}</span>
            </span>
          )}
          {item.iv_environment && <Badge color={ivEnvColor(item.iv_environment)}>{item.iv_environment}</Badge>}
          {item.earnings_date && <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>Earnings: <span style={{ color: C.gold }}>{item.earnings_date}</span></span>}
        </div>
      </div>
    );
  }

  // ─── Market Context section ──────────────────────────────────────────────────
  function MarketContext() {
    if (!resp) return null;
    const ctx = marketCtx;
    const ctxCards = [
      { label: 'Overall Sentiment', value: ctx.overall_sentiment, color: sentimentColor(ctx.overall_sentiment) },
      { label: 'Put/Call Skew', value: ctx.put_call_skew, color: ctx.put_call_skew?.toLowerCase().includes('call') ? C.green : ctx.put_call_skew?.toLowerCase().includes('put') ? C.red : C.dim },
      { label: 'IV Environment', value: ctx.iv_environment, color: ivEnvColor(ctx.iv_environment) },
      { label: 'Market Bias', value: ctx.market_bias, color: sentimentColor(ctx.market_bias) },
    ].filter(c => c.value);

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
          {ctxCards.map((c, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{c.label}</div>
              <div style={{ color: c.color, fontSize: 18, fontWeight: 800, fontFamily: font }}>{c.value}</div>
            </div>
          ))}
        </div>
        {ctx.summary && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', color: C.text, fontSize: 13, fontFamily: sans, lineHeight: 1.7, marginBottom: 14 }}>
            <span style={{ color: C.blue, fontWeight: 700, fontSize: 11, fontFamily: font, textTransform: 'uppercase', marginRight: 8 }}>Smart Money Read</span>
            {ctx.summary}
          </div>
        )}
        {/* Extra context fields */}
        {resp.volume_summary && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
            <div style={{ color: C.dim, fontSize: 10, fontFamily: font, textTransform: 'uppercase', marginBottom: 8 }}>Volume Summary</div>
            <div style={{ color: C.text, fontSize: 12, fontFamily: sans, lineHeight: 1.7 }}>{resp.volume_summary}</div>
          </div>
        )}
        {resp.key_levels && Object.keys(resp.key_levels).length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ color: C.dim, fontSize: 10, fontFamily: font, textTransform: 'uppercase', marginBottom: 8 }}>Key Levels</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {Object.entries(resp.key_levels).map(([k, v]: [string, any]) => (
                <div key={k} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px' }}>
                  <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</div>
                  <div style={{ color: C.blue, fontSize: 13, fontWeight: 700, fontFamily: font }}>{v as string}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const hasData = !loading && resp;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: sans }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: '18px 20px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, position: 'sticky', top: 0, background: C.bg, zIndex: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap className="w-5 h-5" style={{ color: C.green }} />
            <span style={{ color: C.bright, fontSize: 18, fontWeight: 800, fontFamily: font, letterSpacing: '-0.02em' }}>OPTIONS FLOW</span>
            <Badge color={C.blue}>LIVE</Badge>
          </div>
          {hasData && timing && (
            <div style={{ color: C.dim, fontSize: 11, fontFamily: font, marginTop: 3 }}>
              Scanned {scannedCount} tickers in {typeof timing === 'number' ? timing.toFixed(1) : timing}s
            </div>
          )}
        </div>
        <button
          onClick={() => fetchDashboard()}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: `${C.blue}12`, border: `1px solid ${C.blue}30`, borderRadius: 7, color: loading ? C.dim : C.blue, fontSize: 12, fontWeight: 600, fontFamily: font, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Loading */}
          {loading && !hasData && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <LoadingProgress stage={loadStage} />
              <SectionSkeleton />
              <SectionSkeleton />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ background: `${C.red}10`, border: `1px solid ${C.red}30`, borderRadius: 10, padding: '16px 18px', color: C.red, fontSize: 13, fontFamily: sans, marginBottom: 14 }}>
              ⚠ {error}
            </div>
          )}

          {/* Market context banner */}
          {hasData && marketCtx.overall_sentiment && (
            <div style={{ background: `${sentimentColor(marketCtx.overall_sentiment)}0a`, border: `1px solid ${sentimentColor(marketCtx.overall_sentiment)}25`, borderRadius: 10, padding: '12px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', animation: 'fadeIn 0.4s ease' }}>
              <Badge color={sentimentColor(marketCtx.overall_sentiment)}>{marketCtx.overall_sentiment}</Badge>
              {marketCtx.put_call_skew && <span style={{ color: C.text, fontSize: 12, fontFamily: sans }}>{marketCtx.put_call_skew}</span>}
              {marketCtx.iv_environment && <Badge color={ivEnvColor(marketCtx.iv_environment)}>{marketCtx.iv_environment} IV</Badge>}
              {marketCtx.summary && <span style={{ color: C.dim, fontSize: 12, fontFamily: sans, flex: 1 }}>{marketCtx.summary}</span>}
            </div>
          )}

          {/* Tabs */}
          {hasData && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', animation: 'fadeIn 0.4s ease' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setExpandedTicker(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontSize: 11, fontWeight: 600, fontFamily: font, background: tab === t.id ? `${C.blue}18` : 'transparent', color: tab === t.id ? C.blue : C.dim, border: `1px solid ${tab === t.id ? C.blue + '40' : C.border}`, borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {t.icon}
                  {t.label}
                  {t.count ? <span style={{ background: `${C.blue}25`, color: C.blue, borderRadius: 10, padding: '0 5px', fontSize: 9 }}>{t.count}</span> : null}
                </button>
              ))}
            </div>
          )}

          {/* Tab Content */}
          {hasData && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>

              {/* Market Context tab */}
              {tab === 'context' && <MarketContext />}

              {/* Unusual Activity tab */}
              {tab === 'unusual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {unusualActivity.length === 0 && (
                    <div style={{ color: C.dim, fontSize: 13, fontFamily: sans, textAlign: 'center', padding: 40 }}>No unusual activity data returned.</div>
                  )}
                  {unusualActivity.map((item, i) => <UnusualRow key={i} item={item} idx={i} />)}
                </div>
              )}

              {/* Conviction Plays tab */}
              {tab === 'conviction' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {convictionPlays.length === 0 && (
                    <div style={{ color: C.dim, fontSize: 13, fontFamily: sans, textAlign: 'center', padding: 40 }}>No conviction plays data returned.</div>
                  )}
                  {convictionPlays.map((item, i) => <ConvictionRow key={i} item={item} idx={i} />)}
                </div>
              )}

              {/* IV Heat Map tab */}
              {tab === 'iv' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ivHeatmap.length === 0 && (
                    <div style={{ color: C.dim, fontSize: 13, fontFamily: sans, textAlign: 'center', padding: 40 }}>No IV heat map data returned.</div>
                  )}
                  {ivHeatmap.map((item, i) => <IVRow key={i} item={item} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Agent Chatbar ── */}
        <div style={{ borderTop: `1px solid ${C.border}`, background: C.card, padding: '10px 20px 14px' }}>
          {chatMessages.length > 0 && (
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontFamily: sans, lineHeight: 1.6, background: m.role === 'user' ? `${C.blue}18` : C.cardAlt, color: m.role === 'user' ? C.blue : C.text, border: `1px solid ${m.role === 'user' ? C.blue + '30' : C.border}` }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.dim, fontSize: 11, fontFamily: font }}>
                  <Loader2 className="w-3 h-3 animate-spin" /> Analyzing flow...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAgent(); } }}
              placeholder={hasData ? 'Ask about options flow, unusual activity, IV, greeks...' : 'Load dashboard first...'}
              disabled={chatLoading || !hasData}
              style={{ flex: 1, background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 14px', color: C.bright, fontSize: 12, fontFamily: sans, outline: 'none', opacity: hasData ? 1 : 0.5 }}
            />
            <button
              onClick={askAgent}
              disabled={chatLoading || !chatInput.trim() || !hasData}
              style={{ padding: '9px 14px', background: chatLoading || !chatInput.trim() || !hasData ? `${C.dim}20` : `${C.blue}20`, border: `1px solid ${chatLoading || !chatInput.trim() || !hasData ? C.border : C.blue + '40'}`, borderRadius: 8, color: chatLoading || !chatInput.trim() || !hasData ? C.dim : C.blue, cursor: chatLoading || !chatInput.trim() || !hasData ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
