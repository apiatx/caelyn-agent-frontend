import { useState, useEffect, useRef } from 'react';

const AGENT_BACKEND_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
const AGENT_API_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';

interface AgentResult {
  type: string;
  analysis: string;
  structured: any;
}

export default function TradingAgent() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{role: string, content: string, parsed?: any}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [loadingStage, setLoadingStage] = useState('');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [showScreener, setShowScreener] = useState(false);
  const [screenerInput, setScreenerInput] = useState('');
  const [screenerSortCol, setScreenerSortCol] = useState('');
  const [screenerSortAsc, setScreenerSortAsc] = useState(true);
  const [showPrompts, setShowPrompts] = useState(true);
  const [showScansExpanded, setShowScansExpanded] = useState(false);
  const [groupExpanded, setGroupExpanded] = useState<Record<string, boolean>>({ g1: true, g2: true, g3: true, g4: true, g5: true });
  const [allGroupsVisible, setAllGroupsVisible] = useState(true);
  const [savedChats, setSavedChats] = useState<Array<{id: number, title: string, messages: Array<{role: string, content: string, parsed?: any}>, history: Array<{role: string, content: string}>}>>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function newChat() {
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg ? (firstUserMsg.content.length > 60 ? firstUserMsg.content.slice(0, 60) + '...' : firstUserMsg.content) : 'Chat';
      setSavedChats(prev => [{id: Date.now(), title, messages: [...messages], history: [...chatHistory]}, ...prev].slice(0, 20));
    }
    setMessages([]);
    setChatHistory([]);
    setShowPrompts(true);
    setShowScansExpanded(false);
    setShowChatHistory(false);
    setError(null);
    setExpandedTicker(null);
  }

  function loadChat(chat: typeof savedChats[0]) {
    setMessages(chat.messages);
    setChatHistory(chat.history);
    setShowPrompts(false);
    setShowChatHistory(false);
    setExpandedTicker(null);
    setError(null);
  }

  function deleteChat(id: number) {
    setSavedChats(prev => prev.filter(c => c.id !== id));
  }

  async function askAgent(customPrompt?: string, freshChat?: boolean) {
    const q = customPrompt || prompt;

    if (!q.trim()) return;

    const tickerPattern = /^(review|analyze|check|watchlist|rate|my)?\s*[A-Z]{1,5}(\s*[,\s]\s*[A-Z]{1,5}){2,}/i;
    const cleanedQuery = q.trim();
    if (tickerPattern.test(cleanedQuery)) {
      const tickers = cleanedQuery
        .replace(/^(review|analyze|check|watchlist|rate|my)\s*/i, '')
        .split(/[,\s]+/)
        .map(t => t.trim().toUpperCase())
        .filter(t => /^[A-Z]{1,5}$/.test(t))
        .slice(0, 25);
      if (tickers.length >= 3) {
        setPrompt('');
        await sendWatchlistReview(tickers);
        return;
      }
    }

    setLoading(true); setError(null); setExpandedTicker(null);
    setPrompt('');
    setShowPrompts(false);
    setMessages(prev => [...prev, {role: 'user', content: q.trim()}]);

    const historyToSend = freshChat ? [] : chatHistory.slice(-20);

    setLoadingStage('Classifying query...');
    const stages = ['Scanning market data...','Pulling technicals & volume...','Checking social sentiment...','Analyzing insider activity...','Fetching options flow...','Reading macro indicators...','Generating analysis...'];
    let idx = 0;
    const iv = setInterval(() => { if (idx < stages.length) { setLoadingStage(stages[idx]); idx++; } }, 1600);

    try {
      const res = await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY },
        body: JSON.stringify({ prompt: q.trim(), history: historyToSend }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, {role: 'assistant', content: data.analysis || '', parsed: data}]);
      setChatHistory(prev => [...prev, {role:'user',content:q.trim()}, {role:'assistant',content:data.analysis||''}]);
    } catch (err: any) {
      const errMsg = err.message.includes('429') ? 'Rate limit reached. Wait a moment.' : err.message.includes('403') ? 'Auth failed.' : err.message;
      setError(errMsg);
      setMessages(prev => [...prev, {role: 'assistant', content: errMsg}]);
    } finally { clearInterval(iv); setLoadingStage(''); setLoading(false); }
  }

  async function sendWatchlistReview(tickers: string[]) {
    setLoading(true); setError(null); setExpandedTicker(null);
    setShowPrompts(false);
    setMessages(prev => [...prev, {role: 'user', content: `Review my watchlist: ${tickers.join(', ')}`}]);

    setLoadingStage('Analyzing watchlist...');
    const stages = ['Pulling price data...','Scanning technicals...','Checking fundamentals...','Reading sentiment...','Analyzing insider activity...','Building portfolio view...','Generating ratings...'];
    let idx = 0;
    const iv = setInterval(() => { if (idx < stages.length) { setLoadingStage(stages[idx]); idx++; } }, 1800);

    try {
      const res = await fetch(`${AGENT_BACKEND_URL}/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY },
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, {role: 'assistant', content: data.analysis || data.message || '', parsed: data}]);
      setChatHistory(prev => [...prev, {role:'user', content:`Review my watchlist: ${tickers.join(', ')}`}, {role:'assistant', content: data.analysis || data.message || ''}]);
    } catch (err: any) {
      const errMsg = err.message.includes('429') ? 'Rate limit reached. Wait a moment.' : err.message.includes('403') ? 'Auth failed.' : err.message;
      setError(errMsg);
      setMessages(prev => [...prev, {role: 'assistant', content: errMsg}]);
    } finally { clearInterval(iv); setLoadingStage(''); setLoading(false); }
  }


  const C = {
    bg: '#0b0c10', card: '#111318', border: '#1a1d25', text: '#c9cdd6', bright: '#e8eaef',
    dim: '#6b7280', green: '#22c55e', red: '#ef4444', blue: '#3b82f6', gold: '#f59e0b',
    purple: '#a78bfa',
  };
  const font = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
  const sansFont = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  function convColor(c?: string) { return c === 'High' ? C.green : c === 'Medium' ? C.gold : C.red; }
  function changeColor(s?: string) { return (parseFloat(s || '0') >= 0) ? C.green : C.red; }
  function trendColor(s?: string) { if (!s) return C.dim; if (s.includes('↑') || s.toLowerCase().includes('improv') || s.toLowerCase().includes('accel') || s.toLowerCase().includes('expand') || s.toLowerCase().includes('bullish') || s.toLowerCase().includes('above')) return C.green; if (s.includes('↓') || s.toLowerCase().includes('declin') || s.toLowerCase().includes('contract') || s.toLowerCase().includes('bearish') || s.toLowerCase().includes('below')) return C.red; return C.text; }

  function Badge({ children, color, bg }: { children: React.ReactNode, color: string, bg?: string }) {
    return <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:4, fontSize:10, fontWeight:700, fontFamily:font, color, background: bg || `${color}12`, border:`1px solid ${color}25`, letterSpacing:'0.04em', textTransform:'uppercase' }}>{children}</span>;
  }

  function StatRow({ label, value, color }: { label: string, value?: string, color?: string }) {
    if (!value) return null;
    return <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
      <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>{label}</span>
      <span style={{ color: color || trendColor(value), fontSize:12, fontWeight:600, fontFamily:font }}>{value}</span>
    </div>;
  }

  function IndicatorPill({ label, value, signal }: { label: string, value?: string|number, signal?: string }) {
    return <div style={{ background:C.bg, borderRadius:8, padding:'10px 12px', border:`1px solid ${C.border}` }}>
      <div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{label}</div>
      <div style={{ color:C.bright, fontSize:16, fontWeight:700, fontFamily:font }}>{value ?? 'N/A'}</div>
      {signal && <div style={{ color:trendColor(signal), fontSize:10, fontFamily:font, marginTop:2 }}>{signal}</div>}
    </div>;
  }

  function CardWrap({ children, onClick, expanded, borderColor }: { children: React.ReactNode, onClick?: () => void, expanded?: boolean, borderColor?: string }) {
    return <div onClick={onClick} style={{ background:C.card, border:`1px solid ${expanded ? C.blue+'40' : C.border}`, borderLeft:`3px solid ${borderColor || C.border}`, borderRadius:10, overflow:'hidden', cursor: onClick ? 'pointer' : 'default', transition:'all 0.2s' }}>{children}</div>;
  }

  function TradingViewMini({ ticker }: { ticker: string }) {
    return <div style={{ borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}`, margin:'12px 0' }}>
      <iframe src={`https://s.tradingview.com/widgetembed/?symbol=${ticker}&interval=D&theme=dark&style=1&locale=en&hide_top_toolbar=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=200`} style={{ width:'100%', height:200, border:'none', display:'block' }} title={`${ticker} chart`} />
    </div>;
  }

  function formatAnalysis(text: string) {
    if (!text) return '';
    return text
      .replace(/^---+$/gm, '')
      .replace(/^# (.*?)$/gm, `<div style="color:${C.bright};font-weight:800;font-size:18px;margin:20px 0 10px;font-family:${sansFont}">$1</div>`)
      .replace(/^## (.*?)$/gm, `<div style="color:${C.bright};font-weight:700;font-size:16px;margin:16px 0 8px;font-family:${sansFont}">$1</div>`)
      .replace(/^### (.*?)$/gm, `<div style="color:${C.blue};font-weight:700;font-size:14px;margin:12px 0 6px;font-family:${sansFont}">$1</div>`)
      .replace(/\*\*(.*?)\*\*/g, `<span style="color:${C.bright};font-weight:700">$1</span>`)
      .replace(/\n/g, '<br/>');
  }

  function renderTrades(s: any) {
    const picks = s.picks || [];
    return <div>
      {s.market_context && <div style={{ padding:'14px 18px', background:`${C.blue}08`, border:`1px solid ${C.blue}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{s.market_context}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {picks.map((p: any, i: number) => {
          const isExp = expandedTicker === `t-${i}`;
          return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `t-${i}`)} expanded={isExp} borderColor={convColor(p.conviction)}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ width:22, height:22, borderRadius:'50%', background:`${C.blue}15`, display:'inline-flex', alignItems:'center', justifyContent:'center', color:C.blue, fontSize:10, fontWeight:800, fontFamily:font, flexShrink:0 }}>{i+1}</span>
                <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
                <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
                <span style={{ color:changeColor(p.change), fontWeight:600, fontSize:13, fontFamily:font }}>{p.price} <span style={{ fontSize:11 }}>{p.change}</span></span>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Badge color={C.dim}>{p.market_cap}</Badge>
                <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
              </div>
            </div>
            <div style={{ padding:'0 18px 10px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.thesis}</div>
            {p.sources && <div style={{ padding:'0 18px 8px', display:'flex', gap:4, flexWrap:'wrap' }}>
              {(Array.isArray(p.sources) ? p.sources : [p.sources]).map((src: string, j: number) => (
                <span key={j} style={{ padding:'2px 8px', borderRadius:10, fontSize:9, fontWeight:600, fontFamily:font, color:C.dim, background:`${C.dim}10`, border:`1px solid ${C.border}` }}>{src}</span>
              ))}
            </div>}
            <div style={{ padding:'4px 14px', background:`${convColor(p.conviction)}08`, borderTop:`1px solid ${C.border}`, color:convColor(p.conviction), fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>{p.conviction} CONVICTION{p.why_conviction ? ' — ' + p.why_conviction : ''}</div>
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
              <TradingViewMini ticker={p.ticker} />
              {p.ta && <div style={{ marginBottom:10 }}>
                <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Technical Setup — {p.ta.stage || ''}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8 }}>
                  <IndicatorPill label="RSI" value={p.ta.rsi} signal={p.ta.rsi_signal} />
                  <IndicatorPill label="MACD" value="—" signal={p.ta.macd} />
                  <IndicatorPill label="Volume" value={p.ta.volume} signal={p.ta.volume_vs_avg ? `${p.ta.volume_vs_avg} avg` : undefined} />
                  <IndicatorPill label="SMA 20" value="—" signal={p.ta.sma_20} />
                  <IndicatorPill label="SMA 50" value="—" signal={p.ta.sma_50} />
                  <IndicatorPill label="SMA 200" value="—" signal={p.ta.sma_200} />
                </div>
                {p.ta.pattern && <div style={{ marginTop:8, color:C.text, fontSize:11, fontFamily:sansFont }}>Pattern: <span style={{ color:C.bright, fontWeight:600 }}>{p.ta.pattern}</span></div>}
              </div>}
              {p.sentiment && <div style={{ marginBottom:10 }}>
                <div style={{ color:C.purple, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Social Sentiment — {p.sentiment.buzz_level} Buzz</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div style={{ background:`${C.green}08`, border:`1px solid ${C.green}15`, borderRadius:8, padding:12 }}>
                    <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, marginBottom:4 }}>🐂 BULL ({p.sentiment.bull_pct}%)</div>
                    <div style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{p.sentiment.bull_thesis}</div>
                  </div>
                  <div style={{ background:`${C.red}08`, border:`1px solid ${C.red}15`, borderRadius:8, padding:12 }}>
                    <div style={{ color:C.red, fontSize:10, fontWeight:700, fontFamily:font, marginBottom:4 }}>🐻 BEAR</div>
                    <div style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{p.sentiment.bear_thesis}</div>
                  </div>
                </div>
                {p.sentiment.trending && <div style={{ marginTop:8, color:C.dim, fontSize:10, fontFamily:font }}>{p.sentiment.trending}</div>}
              </div>}
              {p.trade_plan && <div style={{ background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, padding:14 }}>
                <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Trade Plan</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
                  {[['Entry', p.trade_plan.entry, C.bright], ['Stop Loss', p.trade_plan.stop, C.red], ['Target 1', p.trade_plan.target_1, C.green], ['Target 2', p.trade_plan.target_2, C.green], ['R/R', p.trade_plan.risk_reward, C.gold]].map(([l,v,c]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:c as string, fontSize:14, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div></div> : null)}
                </div>
              </div>}
            </div>}
          </CardWrap>;
        })}
      </div>
    </div>;
  }

  function renderFundamentals(s: any) {
    const picks = s.picks || [];
    return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {picks.map((p: any, i: number) => {
        const isExp = expandedTicker === `f-${i}`;
        const fin = p.financials || {};
        const val = p.valuation || {};
        return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `f-${i}`)} expanded={isExp} borderColor={convColor(p.conviction)}>
          <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:`${C.blue}15`, display:'inline-flex', alignItems:'center', justifyContent:'center', color:C.blue, fontSize:10, fontWeight:800, fontFamily:font, flexShrink:0 }}>{i+1}</span>
              <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
              <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
              <span style={{ color:changeColor(p.change), fontWeight:600, fontSize:13, fontFamily:font }}>{p.price} {p.change}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Badge color={C.dim}>{p.market_cap}</Badge>
              <Badge color={C.dim}>{p.sector}</Badge>
              <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
            </div>
          </div>
          {p.headline && <div style={{ padding:'0 18px 10px', color:C.gold, fontSize:12, fontWeight:600, fontFamily:sansFont }}>{p.headline}</div>}
          <div style={{ padding:'4px 14px', background:`${convColor(p.conviction)}08`, borderTop:`1px solid ${C.border}`, color:convColor(p.conviction), fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>{p.conviction} CONVICTION{p.why_conviction ? ' — ' + p.why_conviction : ''}</div>
          {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Revenue & Growth</div>
                <StatRow label="Revenue (Latest Q)" value={fin.revenue_latest_q} color={C.bright} />
                <StatRow label="Revenue YoY" value={fin.revenue_yoy_growth} />
                <StatRow label="Revenue QoQ" value={fin.revenue_qoq_growth} />
                <StatRow label="Revenue Trend" value={fin.revenue_trend} />
                <StatRow label="Gross Margin" value={fin.gross_margin} />
                <StatRow label="Gross Margin Δ" value={fin.gross_margin_change} />
              </div>
              <div>
                <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>EBITDA & Profitability</div>
                <StatRow label="EBITDA" value={fin.ebitda} />
                <StatRow label="EBITDA Margin" value={fin.ebitda_margin} />
                <StatRow label="EBITDA Margin (Prev Q)" value={fin.ebitda_margin_prev_q} />
                <StatRow label="EBITDA Margin (Prev Yr)" value={fin.ebitda_margin_prev_year} />
                <StatRow label="EBITDA Trend" value={fin.ebitda_trend} />
                <StatRow label="Net Income" value={fin.net_income} />
                <StatRow label="EPS Surprise" value={fin.eps_surprise} />
                <StatRow label="EPS Streak" value={fin.eps_streak} />
                <StatRow label="FCF" value={fin.fcf} />
                <StatRow label="FCF Margin" value={fin.fcf_margin} />
              </div>
            </div>
            <div style={{ marginTop:16 }}>
              <div style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Valuation</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8 }}>
                {Object.entries(val).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g,' ')} value={v as string} />)}
              </div>
            </div>
            {p.catalyst && <div style={{ marginTop:14, padding:12, background:`${C.gold}08`, border:`1px solid ${C.gold}15`, borderRadius:8, color:C.text, fontSize:12, fontFamily:sansFont }}><span style={{ color:C.gold, fontWeight:700 }}>Catalyst: </span>{p.catalyst}</div>}
          </div>}
        </CardWrap>;
      })}
    </div>;
  }

  function renderTechnicals(s: any) {
    const picks = s.picks || [];
    return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {picks.map((p: any, i: number) => {
        const isExp = expandedTicker === `ta-${i}`;
        const ind = p.indicators || {};
        return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `ta-${i}`)} expanded={isExp} borderColor={convColor(p.conviction)}>
          <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:`${C.blue}15`, display:'inline-flex', alignItems:'center', justifyContent:'center', color:C.blue, fontSize:10, fontWeight:800, fontFamily:font, flexShrink:0 }}>{i+1}</span>
              <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
              <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
              <span style={{ color:changeColor(p.change), fontWeight:600, fontSize:13, fontFamily:font }}>{p.price} {p.change}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Badge color={C.dim}>{p.market_cap}</Badge>
              <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
            </div>
          </div>
          <div style={{ padding:'0 18px 10px', color:C.gold, fontSize:12, fontWeight:600, fontFamily:sansFont }}>{p.setup_name}</div>
          <div style={{ padding:'4px 14px', background:`${convColor(p.conviction)}08`, borderTop:`1px solid ${C.border}`, color:convColor(p.conviction), fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>{p.conviction} CONVICTION{p.why_conviction ? ' — ' + p.why_conviction : ''}</div>
          {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
            <TradingViewMini ticker={p.ticker} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:10 }}>
              <IndicatorPill label="Stage" value={ind.stage} />
              <IndicatorPill label="RSI (14)" value={ind.rsi_14} signal={ind.rsi_signal} />
              <IndicatorPill label="MACD" value="—" signal={ind.macd} />
              <IndicatorPill label="MACD Histogram" value="—" signal={ind.macd_histogram} />
              <IndicatorPill label="SMA 20" value="—" signal={ind.sma_20} />
              <IndicatorPill label="SMA 50" value="—" signal={ind.sma_50} />
              <IndicatorPill label="SMA 200" value="—" signal={ind.sma_200} />
              <IndicatorPill label="Bollinger" value="—" signal={ind.bollinger} />
              <IndicatorPill label="Volume" value={ind.volume_today} signal={`${ind.volume_ratio || ''} ${ind.volume_pattern || ''}`} />
              <IndicatorPill label="Rel. Strength" value="—" signal={ind.relative_strength} />
              <IndicatorPill label="Support" value="—" signal={ind.support} />
              <IndicatorPill label="Resistance" value="—" signal={ind.resistance} />
            </div>
            {p.pattern && <div style={{ padding:12, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont, marginBottom:10 }}>{p.pattern}</div>}
            {p.trade_plan && <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:8, padding:14 }}>
              <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, marginBottom:10, textTransform:'uppercase' }}>Trade Plan</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
                {[['Entry', p.trade_plan.entry, C.bright], ['Stop', p.trade_plan.stop, C.red], ['Target 1', p.trade_plan.target_1, C.green], ['Target 2', p.trade_plan.target_2, C.green], ['R/R', p.trade_plan.risk_reward, C.gold]].map(([l,v,c]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:c as string, fontSize:14, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div></div> : null)}
              </div>
            </div>}
          </div>}
        </CardWrap>;
      })}
    </div>;
  }

  function renderAnalysis(s: any) {
    return <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:C.blue, fontWeight:800, fontSize:22, fontFamily:font }}>{s.ticker}</span>
          <span style={{ color:C.dim, fontSize:13 }}>{s.company}</span>
          <span style={{ color:changeColor(s.change), fontWeight:700, fontSize:15, fontFamily:font }}>{s.price} {s.change}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Badge color={C.dim}>{s.market_cap}</Badge>
          <Badge color={C.blue}>{s.stage}</Badge>
        </div>
      </div>
      {s.verdict && <div style={{ padding:'14px 18px', background:`${C.green}08`, border:`1px solid ${C.green}20`, borderRadius:10, marginBottom:10, color:C.bright, fontSize:13, fontWeight:600, fontFamily:sansFont }}>{s.verdict}</div>}
      {s.ticker && <TradingViewMini ticker={s.ticker} />}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
        {s.ta && <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
          <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:12 }}>Technical</div>
          {Object.entries(s.ta).map(([k,v]) => <StatRow key={k} label={k.replace(/_/g,' ')} value={v as string} />)}
        </div>}
        {s.fundamentals && <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
          <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:12 }}>Fundamentals</div>
          {Object.entries(s.fundamentals).map(([k,v]) => <StatRow key={k} label={k.replace(/_/g,' ')} value={v as string} />)}
        </div>}
        {s.sentiment && <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
          <div style={{ color:C.purple, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:12 }}>Sentiment</div>
          <StatRow label="Buzz" value={s.sentiment.buzz_level} />
          <StatRow label="Bull %" value={`${s.sentiment.bull_pct}%`} color={C.green} />
          <StatRow label="Fear & Greed" value={String(s.sentiment.fear_greed)} />
          <StatRow label="Put/Call" value={s.sentiment.put_call} />
          <div style={{ marginTop:10, padding:10, background:`${C.green}08`, borderRadius:6, fontSize:11, color:C.text, lineHeight:1.5 }}>🐂 {s.sentiment.bull_thesis}</div>
          <div style={{ marginTop:6, padding:10, background:`${C.red}08`, borderRadius:6, fontSize:11, color:C.text, lineHeight:1.5 }}>🐻 {s.sentiment.bear_thesis}</div>
        </div>}
      </div>
      {s.trade_plan && <div style={{ background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:10, padding:16 }}>
        <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:12 }}>Trade Plan</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10 }}>
          {[['Entry', s.trade_plan.entry, C.bright], ['Stop Loss', s.trade_plan.stop, C.red], ['Target 1', s.trade_plan.target_1, C.green], ['Target 2', s.trade_plan.target_2, C.green], ['R/R', s.trade_plan.risk_reward, C.gold], ['Timeframe', s.trade_plan.timeframe, C.dim]].map(([l,v,c]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:c as string, fontSize:16, fontWeight:700, fontFamily:font, marginTop:3 }}>{v as string}</div></div> : null)}
        </div>
      </div>}
    </div>;
  }

  function renderInvestments(s: any) {
    const picks = s.picks || [];
    return <div>
      {s.market_context && <div style={{ padding:'14px 18px', background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{s.market_context}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {picks.map((p: any, i: number) => {
          const isExp = expandedTicker === `inv-${i}`;
          const fund = p.fundamentals || {};
          const sq = p.sqglp || {};
          return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `inv-${i}`)} expanded={isExp} borderColor={convColor(p.conviction)}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ width:22, height:22, borderRadius:'50%', background:`${C.blue}15`, display:'inline-flex', alignItems:'center', justifyContent:'center', color:C.blue, fontSize:10, fontWeight:800, fontFamily:font, flexShrink:0 }}>{i+1}</span>
                <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
                <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
                <span style={{ color:C.bright, fontWeight:600, fontSize:13, fontFamily:font }}>{p.price}</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Badge color={C.dim}>{p.market_cap}</Badge>
                <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
              </div>
            </div>
            <div style={{ padding:'0 18px 10px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.investment_thesis}</div>
            <div style={{ padding:'4px 14px', background:`${convColor(p.conviction)}08`, borderTop:`1px solid ${C.border}`, color:convColor(p.conviction), fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>{p.conviction} CONVICTION{p.why_conviction ? ' — ' + p.why_conviction : ''}</div>
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
              {p.moat && <div style={{ padding:12, background:`${C.purple}08`, border:`1px solid ${C.purple}15`, borderRadius:8, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont }}><span style={{ color:C.purple, fontWeight:700 }}>Moat: </span>{p.moat}</div>}
              <div style={{ marginBottom:10 }}>
                <div style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>SQGLP Assessment</div>
                {Object.entries(sq).map(([k, v]) => <StatRow key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v as string} />)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:10 }}>
                <div>
                  <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Growth & Profitability</div>
                  <StatRow label="Revenue YoY" value={fund.revenue_growth_yoy} />
                  <StatRow label="EBITDA Margin" value={fund.ebitda_margin} />
                  <StatRow label="EBITDA Trend" value={fund.ebitda_margin_trend} />
                  <StatRow label="Insider Buying" value={fund.insider_buying} />
                  <StatRow label="Short Float" value={fund.short_float} />
                </div>
                <div>
                  <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Valuation</div>
                  <StatRow label="P/E" value={fund.pe_ratio} color={C.bright} />
                  <StatRow label="P/S" value={fund.ps_ratio} color={C.bright} />
                  <StatRow label="EV/EBITDA" value={fund.ev_ebitda} color={C.bright} />
                  <StatRow label="Analyst Target" value={fund.analyst_target} />
                  <StatRow label="Earnings Streak" value={fund.earnings_streak} />
                </div>
              </div>
              {p.risk && <div style={{ padding:12, background:`${C.red}08`, border:`1px solid ${C.red}15`, borderRadius:8, color:C.text, fontSize:12, fontFamily:sansFont }}><span style={{ color:C.red, fontWeight:700 }}>Risk: </span>{p.risk}</div>}
              {p.stage && <div style={{ marginTop:10, color:C.dim, fontSize:11, fontFamily:font }}>Weinstein: {p.stage}</div>}
            </div>}
          </CardWrap>;
        })}
      </div>
    </div>;
  }

  function renderScreener(s: any) {
    const topPicks = s.top_picks || [];
    const rows = s.results || [];
    const sortedRows = [...rows].sort((a: any, b: any) => {
      if (!screenerSortCol) return 0;
      const av = a[screenerSortCol] ?? '';
      const bv = b[screenerSortCol] ?? '';
      const an = parseFloat(String(av).replace(/[^0-9.\-]/g, ''));
      const bn = parseFloat(String(bv).replace(/[^0-9.\-]/g, ''));
      if (!isNaN(an) && !isNaN(bn)) return screenerSortAsc ? an - bn : bn - an;
      return screenerSortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    const cols = [
      {key:'ticker', label:'Ticker', w:'70px'},
      {key:'company', label:'Company', w:'1fr'},
      {key:'price', label:'Price', w:'80px'},
      {key:'change', label:'Chg%', w:'70px'},
      {key:'market_cap', label:'Mkt Cap', w:'80px'},
      {key:'rev_growth', label:'Rev Grw', w:'70px'},
      {key:'margin', label:'Margin', w:'65px'},
      {key:'pe', label:'P/E', w:'55px'},
      {key:'rsi', label:'RSI', w:'50px'},
      {key:'volume', label:'Vol', w:'70px'},
      {key:'analyst_rating', label:'Rating', w:'70px'},
      {key:'upside', label:'Upside', w:'65px'},
    ];
    const handleSort = (key: string) => {
      if (screenerSortCol === key) setScreenerSortAsc(!screenerSortAsc);
      else { setScreenerSortCol(key); setScreenerSortAsc(true); }
    };

    return <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
      {s.summary && <div style={{ padding:'14px 18px', background:`${C.purple}08`, border:`1px solid ${C.purple}20`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{s.summary}</div>}

      {topPicks.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:14, fontWeight:800, fontFamily:sansFont, marginBottom:10 }}>Top Picks</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {topPicks.map((pick: any, i: number) => (
            <div key={i} style={{ padding:'14px 18px', background:C.card, border:`1px solid ${C.purple}25`, borderRadius:10, borderLeft:`3px solid ${C.purple}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ color:C.gold, fontWeight:800, fontSize:16, fontFamily:font }}>#{i+1}</span>
                <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{pick.ticker}</span>
                <span style={{ color:C.dim, fontSize:11 }}>{pick.company}</span>
                <span style={{ color:C.bright, fontSize:14, fontWeight:700, fontFamily:font }}>{pick.price}</span>
                <span style={{ color:changeColor(pick.change), fontSize:12, fontWeight:600, fontFamily:font }}>{pick.change}</span>
                {pick.conviction && <Badge color={convColor(pick.conviction)}>{pick.conviction}</Badge>}
              </div>
              <div style={{ color:C.text, fontSize:12, lineHeight:1.7, fontFamily:sansFont }}>{pick.analysis || pick.thesis}</div>
            </div>
          ))}
        </div>
      </div>}

      {sortedRows.length > 0 && <div style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{ display:'grid', gridTemplateColumns:cols.map(c => c.w).join(' '), background:'#0d0e12', borderBottom:`1px solid ${C.border}` }}>
          {cols.map(col => (
            <div key={col.key} onClick={() => handleSort(col.key)} style={{ padding:'8px 6px', color:screenerSortCol === col.key ? C.blue : C.dim, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer', userSelect:'none', display:'flex', alignItems:'center', gap:2 }}>
              {col.label}{screenerSortCol === col.key ? (screenerSortAsc ? ' ↑' : ' ↓') : ''}
            </div>
          ))}
        </div>
        {sortedRows.map((row: any, i: number) => {
          const isExp = expandedTicker === `scr-${i}`;
          const isTop = topPicks.some((p: any) => p.ticker === row.ticker);
          return <div key={i}>
            <div onClick={() => setExpandedTicker(isExp ? null : `scr-${i}`)} style={{ display:'grid', gridTemplateColumns:cols.map(c => c.w).join(' '), background: isTop ? `${C.purple}06` : (i % 2 === 0 ? C.card : C.bg), borderBottom:`1px solid ${C.border}`, cursor:'pointer', transition:'background 0.1s', borderLeft: isTop ? `2px solid ${C.purple}` : '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.background = `${C.blue}08`} onMouseLeave={e => e.currentTarget.style.background = isTop ? `${C.purple}06` : (i % 2 === 0 ? C.card : C.bg)}>
              <div style={{ padding:'8px 6px', color:C.blue, fontSize:12, fontWeight:700, fontFamily:font }}>{row.ticker}</div>
              <div style={{ padding:'8px 6px', color:C.text, fontSize:11, fontFamily:sansFont, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.company}</div>
              <div style={{ padding:'8px 6px', color:C.bright, fontSize:12, fontWeight:600, fontFamily:font }}>{row.price}</div>
              <div style={{ padding:'8px 6px', color:changeColor(row.change), fontSize:11, fontWeight:600, fontFamily:font }}>{row.change}</div>
              <div style={{ padding:'8px 6px', color:C.text, fontSize:11, fontFamily:font }}>{row.market_cap}</div>
              <div style={{ padding:'8px 6px', color:trendColor(row.rev_growth), fontSize:11, fontWeight:600, fontFamily:font }}>{row.rev_growth}</div>
              <div style={{ padding:'8px 6px', color:trendColor(row.margin), fontSize:11, fontFamily:font }}>{row.margin}</div>
              <div style={{ padding:'8px 6px', color:C.text, fontSize:11, fontFamily:font }}>{row.pe}</div>
              <div style={{ padding:'8px 6px', color: parseFloat(row.rsi||'50') < 35 ? C.green : parseFloat(row.rsi||'50') > 70 ? C.red : C.text, fontSize:11, fontWeight:600, fontFamily:font }}>{row.rsi}</div>
              <div style={{ padding:'8px 6px', color:C.text, fontSize:11, fontFamily:font }}>{row.volume}</div>
              <div style={{ padding:'8px 6px', color: row.analyst_rating?.toLowerCase().includes('buy') ? C.green : row.analyst_rating?.toLowerCase().includes('sell') ? C.red : C.text, fontSize:10, fontWeight:600, fontFamily:font }}>{row.analyst_rating}</div>
              <div style={{ padding:'8px 6px', color:changeColor(row.upside), fontSize:11, fontWeight:600, fontFamily:font }}>{row.upside}</div>
            </div>
            {isExp && <div style={{ padding:14, background:`${C.card}`, borderBottom:`1px solid ${C.border}` }}>
              <TradingViewMini ticker={row.ticker} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
                {row.ta_summary && <div style={{ background:C.bg, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.blue, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Technical</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.7, fontFamily:sansFont }}>{row.ta_summary}</div>
                </div>}
                {row.fundamental_summary && <div style={{ background:C.bg, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Fundamentals</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.7, fontFamily:sansFont }}>{row.fundamental_summary}</div>
                </div>}
              </div>
              {row.thesis && <div style={{ padding:10, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, marginBottom:12, color:C.text, fontSize:11, fontFamily:sansFont, lineHeight:1.6 }}>{row.thesis}</div>}
              {row.trade_plan && <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:8, padding:14 }}>
                <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, marginBottom:10, textTransform:'uppercase' }}>Trade Plan</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
                  {[['Entry', row.trade_plan.entry, C.bright], ['Stop', row.trade_plan.stop, C.red], ['Target', row.trade_plan.target, C.green], ['R/R', row.trade_plan.risk_reward, C.gold]].map(([l,v,col]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:col as string, fontSize:14, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div></div> : null)}
                </div>
              </div>}
            </div>}
          </div>;
        })}
      </div>}
    </div>;
  }

  function renderCrypto(s: any) {
    const momentum = s.top_momentum || [];
    const categories = s.hot_categories || [];
    const funding = s.funding_analysis || {};
    const catalysts = s.upcoming_catalysts || [];
    const onChain = s.on_chain_signals || {};
    const btcEth = s.btc_eth_summary || {};

    return <div>
      {s.market_overview && <div style={{ padding:'16px 20px', background:`${C.purple}08`, border:`1px solid ${C.purple}20`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{s.market_overview}</div>}

      {(btcEth.btc || btcEth.eth) && <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
        {['btc', 'eth'].map(key => {
          const d = btcEth[key];
          if (!d) return null;
          return <div key={key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ color:key === 'btc' ? '#f7931a' : '#627eea', fontWeight:800, fontSize:16, fontFamily:font }}>{key.toUpperCase()}</span>
              <span style={{ color:C.bright, fontSize:18, fontWeight:700, fontFamily:font }}>{d.price}</span>
            </div>
            <div style={{ display:'flex', gap:12, fontSize:11, fontFamily:font, marginBottom:8 }}>
              <span style={{ color:C.dim }}>24h: <span style={{ color:changeColor(d.change_24h), fontWeight:600 }}>{d.change_24h}</span></span>
              {d.change_7d && <span style={{ color:C.dim }}>7d: <span style={{ color:changeColor(d.change_7d), fontWeight:600 }}>{d.change_7d}</span></span>}
              {d.dominance && <span style={{ color:C.dim }}>Dom: <span style={{ color:C.bright }}>{d.dominance}</span></span>}
              {d.funding_rate && <span style={{ color:C.dim }}>Funding: <span style={{ color:parseFloat(d.funding_rate) > 0.03 ? C.red : parseFloat(d.funding_rate) < -0.01 ? C.green : C.text, fontWeight:600 }}>{d.funding_rate}</span></span>}
            </div>
            {d.signal && <div style={{ color:trendColor(d.signal), fontSize:11, fontFamily:sansFont }}>{d.signal}</div>}
          </div>;
        })}
      </div>}

      {Object.keys(funding).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Derivatives & Funding Rates</div>
        {funding.market_bias && <div style={{ padding:'10px 16px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, marginBottom:10, display:'flex', gap:16, fontSize:11, fontFamily:font }}>
          <span style={{ color:C.dim }}>Market Bias: <span style={{ color:trendColor(funding.market_bias), fontWeight:600 }}>{funding.market_bias}</span></span>
          <span style={{ color:C.dim }}>Avg Funding: <span style={{ color:C.bright }}>{funding.avg_funding_rate}%</span></span>
          <span style={{ color:C.dim }}>Perps Tracked: <span style={{ color:C.bright }}>{funding.total_perps_tracked}</span></span>
        </div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {funding.crowded_longs && funding.crowded_longs.length > 0 && <div style={{ background:`${C.red}06`, border:`1px solid ${C.red}12`, borderRadius:8, padding:12 }}>
            <div style={{ color:C.red, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>Crowded Longs (Correction Risk)</div>
            {funding.crowded_longs.slice(0, 5).map((f: any, i: number) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', fontSize:11, fontFamily:font }}>
                <span style={{ color:C.bright }}>{f.symbol}</span>
                <span style={{ color:C.red, fontWeight:600 }}>+{f.funding}%</span>
              </div>
            ))}
          </div>}
          {funding.squeeze_candidates && funding.squeeze_candidates.length > 0 && <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}12`, borderRadius:8, padding:12 }}>
            <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>Squeeze Candidates (Short Crowding)</div>
            {funding.squeeze_candidates.slice(0, 5).map((f: any, i: number) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', fontSize:11, fontFamily:font }}>
                <span style={{ color:C.bright }}>{f.symbol}</span>
                <span style={{ color:C.green, fontWeight:600 }}>{f.funding}%</span>
              </div>
            ))}
          </div>}
        </div>
      </div>}

      {categories.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Narrative Rotation — Hot Categories</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
          {categories.map((cat: any, i: number) => (
            <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:12 }}>
              <div style={{ color:C.purple, fontWeight:700, fontSize:12, fontFamily:font, marginBottom:4 }}>{cat.name}</div>
              <div style={{ color:changeColor(cat.market_cap_change_24h), fontSize:16, fontWeight:700, fontFamily:font, marginBottom:4 }}>{cat.market_cap_change_24h}</div>
              {cat.top_coins && <div style={{ color:C.dim, fontSize:10, fontFamily:font }}>Leaders: <span style={{ color:C.text }}>{cat.top_coins}</span></div>}
              {cat.signal && <div style={{ color:trendColor(cat.signal), fontSize:10, fontFamily:sansFont, marginTop:4 }}>{cat.signal}</div>}
            </div>
          ))}
        </div>
      </div>}

      {momentum.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Top Momentum Picks</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {momentum.map((c: any, i: number) => {
            const isExp = expandedTicker === `crypto-${i}`;
            return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `crypto-${i}`)} expanded={isExp}>
              <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ color:C.purple, fontWeight:800, fontSize:15, fontFamily:font }}>{c.symbol}</span>
                  <span style={{ color:C.dim, fontSize:11 }}>{c.coin}</span>
                  <span style={{ color:C.bright, fontSize:15, fontWeight:700, fontFamily:font }}>{c.price}</span>
                  <span style={{ color:changeColor(c.change_24h), fontWeight:600, fontSize:12, fontFamily:font }}>{c.change_24h}</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <Badge color={C.dim}>{c.market_cap}</Badge>
                  <Badge color={convColor(c.conviction)}>{c.conviction}</Badge>
                </div>
              </div>
              <div style={{ padding:'0 18px 10px', display:'flex', gap:8, fontSize:11, fontFamily:font }}>
                <span style={{ color:C.dim }}>7d: <span style={{ color:changeColor(c.change_7d), fontWeight:600 }}>{c.change_7d}</span></span>
                <span style={{ color:C.dim }}>30d: <span style={{ color:changeColor(c.change_30d), fontWeight:600 }}>{c.change_30d}</span></span>
                <span style={{ color:C.dim }}>Funding: <span style={{ color:parseFloat(c.funding_rate || '0') > 0.03 ? C.red : parseFloat(c.funding_rate || '0') < -0.01 ? C.green : C.text, fontWeight:600 }}>{c.funding_rate}</span></span>
                <span style={{ color:C.dim }}>OI: <span style={{ color:C.bright }}>{c.open_interest}</span></span>
              </div>
              <div style={{ padding:'0 18px 14px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont }}>{c.thesis}</div>
              {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
                {c.social && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8, marginBottom:10 }}>
                  {c.social.twitter_followers && <IndicatorPill label="Twitter" value={c.social.twitter_followers} />}
                  {c.social.reddit_subscribers && <IndicatorPill label="Reddit" value={c.social.reddit_subscribers} />}
                  {c.social.dev_activity && <IndicatorPill label="Dev Activity" value="—" signal={c.social.dev_activity} />}
                  {c.social.sentiment && <IndicatorPill label="Sentiment" value={c.social.sentiment} />}
                </div>}
                {c.setup && <div style={{ padding:10, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, marginBottom:12, color:C.text, fontSize:11, fontFamily:sansFont }}><span style={{ color:C.blue, fontWeight:700 }}>Setup: </span>{c.setup}</div>}
                {c.risk && <div style={{ padding:10, background:`${C.red}06`, border:`1px solid ${C.red}12`, borderRadius:8, marginBottom:12, color:C.text, fontSize:11, fontFamily:sansFont }}><span style={{ color:C.red, fontWeight:700 }}>Risk: </span>{c.risk}</div>}
                {c.trade_plan && <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:8, padding:14 }}>
                  <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, marginBottom:10, textTransform:'uppercase' }}>Trade Plan</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
                    {[['Entry', c.trade_plan.entry, C.bright], ['Stop', c.trade_plan.stop, C.red], ['Target 1', c.trade_plan.target_1, C.green], ['Target 2', c.trade_plan.target_2, C.green], ['R/R', c.trade_plan.risk_reward, C.gold]].map(([l,v,col]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:col as string, fontSize:14, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div></div> : null)}
                  </div>
                </div>}
              </div>}
            </CardWrap>;
          })}
        </div>
      </div>}

      {Object.keys(onChain).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>On-Chain Signals</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8 }}>
          {Object.entries(onChain).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g, ' ')} value={v as string} />)}
        </div>
      </div>}

      {catalysts.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Upcoming Catalysts</div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          {catalysts.map((cat: string, i: number) => (
            <div key={i} style={{ padding:'6px 0', borderBottom: i < catalysts.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:12, fontFamily:sansFont }}>📅 {cat}</div>
          ))}
        </div>
      </div>}
    </div>;
  }

  function renderBriefing(s: any) {
    const pulse = s.market_pulse || {};
    const numbers = s.key_numbers || {};
    const moving = s.whats_moving || [];
    const highlights = s.signal_highlights || {};
    const topMoves = s.top_moves || [];
    const catalysts = s.upcoming_catalysts || [];

    const verdictColor = (v?: string) => {
      if (!v) return C.dim;
      const lower = v.toLowerCase();
      if (lower.includes('bullish') && !lower.includes('cautious')) return C.green;
      if (lower.includes('cautiously bullish')) return '#4ade80';
      if (lower.includes('neutral')) return C.gold;
      if (lower.includes('cautiously bearish')) return '#f97316';
      if (lower.includes('bearish')) return C.red;
      return C.dim;
    };

    const regimeColor = (r?: string) => {
      if (!r) return C.dim;
      if (r.toLowerCase().includes('risk-on')) return C.green;
      if (r.toLowerCase().includes('risk-off')) return C.red;
      return C.gold;
    };

    return <div>
      <div style={{ padding:'20px 24px', background:`linear-gradient(135deg, ${C.card} 0%, ${C.bg} 100%)`, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:22 }}>⚡</span>
            <span style={{ color:verdictColor(pulse.verdict), fontSize:20, fontWeight:800, fontFamily:sansFont }}>{pulse.verdict || 'Loading...'}</span>
          </div>
          {pulse.regime && <Badge color={regimeColor(pulse.regime)}>{pulse.regime}</Badge>}
        </div>
        {pulse.summary && <div style={{ color:C.text, fontSize:13, lineHeight:1.7, fontFamily:sansFont }}>{pulse.summary}</div>}
      </div>

      {Object.keys(numbers).length > 0 && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:10 }}>
        {Object.entries(numbers).map(([key, val]: [string, any]) => (
          <div key={key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px' }}>
            <div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{key.replace(/_/g, ' ')}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ color:C.bright, fontSize:15, fontWeight:700, fontFamily:font }}>{val?.price || val?.value || 'N/A'}</span>
              {val?.change && <span style={{ color:changeColor(val.change), fontSize:11, fontWeight:600, fontFamily:font }}>{val.change}</span>}
            </div>
            {val?.trend && <div style={{ color:trendColor(val.trend), fontSize:10, fontFamily:font, marginTop:2 }}>{val.trend}</div>}
            {val?.label && <div style={{ color:trendColor(val.label), fontSize:10, fontFamily:font, marginTop:2 }}>{val.label}</div>}
          </div>
        ))}
      </div>}

      {moving.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>What's Moving</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {moving.map((item: any, i: number) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <Badge color={C.blue}>{item.category}</Badge>
              <span style={{ color:C.text, fontSize:12, fontFamily:sansFont, flex:1 }}>{item.headline}</span>
            </div>
          ))}
        </div>
      </div>}

      {Object.keys(highlights).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Top Signal From Each Scanner</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
          {Object.entries(highlights).map(([key, val]: [string, any]) => {
            const labelMap: Record<string, {icon: string, color: string}> = {
              'best_ta_setup': {icon: '📈', color: C.blue},
              'best_fundamental': {icon: '💎', color: C.green},
              'hottest_social': {icon: '🚀', color: C.purple},
              'top_squeeze': {icon: '💥', color: C.red},
              'biggest_volume': {icon: '📊', color: C.gold},
              'strongest_sector': {icon: '🔄', color: '#06b6d4'},
            };
            const cfg = labelMap[key] || {icon: '•', color: C.dim};
            return <div key={key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:14 }}>{cfg.icon}</span>
                <span style={{ color:cfg.color, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>{key.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ color:C.bright, fontSize:14, fontWeight:700, fontFamily:font, marginBottom:4 }}>{val?.ticker || val?.sector || 'N/A'}</div>
              <div style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{val?.signal || ''}</div>
            </div>;
          })}
        </div>
      </div>}

      {topMoves.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:14, fontWeight:800, fontFamily:sansFont, marginBottom:10 }}>Top Moves Today</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {topMoves.map((move: any, i: number) => {
            const isExp = expandedTicker === `brief-${i}`;
            return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `brief-${i}`)} expanded={isExp}>
              <div style={{ padding:'16px 20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ color:C.gold, fontWeight:800, fontSize:18, fontFamily:font }}>#{move.rank}</span>
                    <span style={{ color:C.blue, fontWeight:800, fontSize:18, fontFamily:font }}>{move.ticker}</span>
                    <Badge color={move.action === 'BUY' ? C.green : move.action === 'SHORT' ? C.red : C.gold}>{move.action}</Badge>
                    <Badge color={convColor(move.conviction)}>{move.conviction}</Badge>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font }}>{move.signal_count} signals</span>
                  </div>
                </div>
                {move.signals_stacking && <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
                  {move.signals_stacking.map((sig: string, j: number) => (
                    <span key={j} style={{ padding:'2px 8px', borderRadius:4, fontSize:9, fontWeight:600, fontFamily:font, color:C.gold, background:`${C.gold}10`, border:`1px solid ${C.gold}20` }}>{sig.replace(/_/g, ' ')}</span>
                  ))}
                </div>}
                <div style={{ color:C.text, fontSize:12, lineHeight:1.7, fontFamily:sansFont }}>{move.thesis}</div>
              </div>
              {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
                <TradingViewMini ticker={move.ticker} />
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8, marginTop:12 }}>
                  {[
                    ['Entry', move.entry, C.bright],
                    ['Stop Loss', move.stop, C.red],
                    ['Target', move.target, C.green],
                    ['R/R', move.risk_reward, C.gold],
                    ['Timeframe', move.timeframe, C.dim],
                  ].map(([l, v, c]) => v ? <div key={l as string}>
                    <div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div>
                    <div style={{ color:c as string, fontSize:15, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div>
                  </div> : null)}
                </div>
              </div>}
            </CardWrap>;
          })}
        </div>
      </div>}

      {catalysts.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:8 }}>Upcoming Catalysts</div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:12 }}>
          {catalysts.map((cat: string, i: number) => (
            <div key={i} style={{ padding:'5px 0', borderBottom: i < catalysts.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:11, fontFamily:sansFont, display:'flex', gap:8 }}>
              <span style={{ color:C.gold }}>📅</span> {cat}
            </div>
          ))}
        </div>
      </div>}

      {s.portfolio_bias && <div style={{ padding:'14px 18px', background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, lineHeight:1.7, fontFamily:sansFont }}>
        <span style={{ color:C.blue, fontWeight:700 }}>Portfolio Bias: </span>{s.portfolio_bias}
      </div>}
    </div>;
  }

  function renderPortfolio(s: any) {
    const positions = s.positions || [];
    const insights = s.portfolio_insights || {};

    const ratingConfig: Record<string, {color: string, bg: string}> = {
      'Strong Buy': { color: '#22c55e', bg: '#22c55e12' },
      'Buy': { color: '#4ade80', bg: '#4ade8012' },
      'Hold': { color: '#f59e0b', bg: '#f59e0b12' },
      'Sell': { color: '#ef4444', bg: '#ef444412' },
      'Short': { color: '#dc2626', bg: '#dc262612' },
    };

    return <div>
      {s.summary && <div style={{ padding:'16px 20px', background:`${C.blue}08`, border:`1px solid ${C.blue}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{s.summary}</div>}

      {s.spy_context && <div style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 16px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, marginBottom:10 }}>
        <span style={{ color:C.dim, fontSize:11, fontWeight:700, fontFamily:font }}>SPY BENCHMARK</span>
        <span style={{ color:C.bright, fontSize:14, fontWeight:700, fontFamily:font }}>{s.spy_context.price}</span>
        <span style={{ color:changeColor(s.spy_context.change), fontSize:12, fontWeight:600, fontFamily:font }}>{s.spy_context.change}</span>
        <span style={{ color:trendColor(s.spy_context.trend), fontSize:11, fontFamily:font }}>{s.spy_context.trend}</span>
      </div>}

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:10 }}>
        {positions.map((p: any, i: number) => {
          const isExp = expandedTicker === `port-${i}`;
          const rc = ratingConfig[p.rating] || ratingConfig['Hold'];
          return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `port-${i}`)} expanded={isExp}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
                <span style={{ color:C.dim, fontSize:11 }}>{p.company}</span>
                <span style={{ color:changeColor(p.change), fontWeight:600, fontSize:13, fontFamily:font }}>{p.price} {p.change}</span>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Badge color={C.dim}>{p.market_cap}</Badge>
                <span style={{ display:'inline-block', padding:'4px 14px', borderRadius:6, fontSize:11, fontWeight:800, fontFamily:font, color:rc.color, background:rc.bg, border:`1px solid ${rc.color}30`, letterSpacing:'0.04em', textTransform:'uppercase' }}>{p.rating}</span>
              </div>
            </div>
            <div style={{ padding:'0 18px 10px', display:'flex', gap:16, fontSize:10, fontFamily:font }}>
              <span style={{ color:C.dim }}>Combined: <span style={{ color:C.bright, fontWeight:700 }}>{p.combined_score}</span></span>
              <span style={{ color:C.dim }}>Trade: <span style={{ color:C.blue }}>{p.trade_score}</span></span>
              <span style={{ color:C.dim }}>Invest: <span style={{ color:C.green }}>{p.invest_score}</span></span>
              {p.relative_strength && <span style={{ color:C.dim }}>vs SPY: <span style={{ color:trendColor(p.relative_strength) }}>{p.relative_strength}</span></span>}
            </div>
            <div style={{ padding:'0 18px 14px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont }}>{p.thesis}</div>
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
              <TradingViewMini ticker={p.ticker} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
                <div style={{ background:C.bg, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.blue, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Technical</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.7, fontFamily:sansFont }}>{p.ta_summary}</div>
                </div>
                <div style={{ background:C.bg, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Fundamentals</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.7, fontFamily:sansFont }}>{p.fundamental_summary}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:10 }}>
                {p.sentiment && <div style={{ background:C.bg, borderRadius:8, padding:10, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.purple, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>Sentiment</div>
                  <div style={{ color:C.text, fontSize:11, fontFamily:sansFont }}>{p.sentiment}</div>
                </div>}
                {p.insider_activity && <div style={{ background:C.bg, borderRadius:8, padding:10, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.gold, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>Insider Activity</div>
                  <div style={{ color:C.text, fontSize:11, fontFamily:sansFont }}>{p.insider_activity}</div>
                </div>}
                {p.key_risk && <div style={{ background:`${C.red}06`, borderRadius:8, padding:10, border:`1px solid ${C.red}12` }}>
                  <div style={{ color:C.red, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>Key Risk</div>
                  <div style={{ color:C.text, fontSize:11, fontFamily:sansFont }}>{p.key_risk}</div>
                </div>}
              </div>
              {p.action && <div style={{ padding:12, background:`${rc.bg}`, border:`1px solid ${rc.color}20`, borderRadius:8, color:C.bright, fontSize:12, fontWeight:600, fontFamily:sansFont }}>
                <span style={{ color:rc.color, fontWeight:700 }}>Action: </span>{p.action}
              </div>}
            </div>}
          </CardWrap>;
        })}
      </div>

      {Object.keys(insights).length > 0 && <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:14, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Portfolio Insights</div>
        {insights.sector_concentration && <div style={{ marginBottom:12 }}>
          <div style={{ color:C.blue, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Sector Concentration</div>
          <div style={{ color:C.text, fontSize:12, fontFamily:sansFont }}>{insights.sector_concentration}</div>
        </div>}
        {insights.risk_flags && insights.risk_flags.length > 0 && <div style={{ marginBottom:12 }}>
          <div style={{ color:C.red, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Risk Flags</div>
          {insights.risk_flags.map((flag: string, i: number) => (
            <div key={i} style={{ padding:'6px 0', borderBottom: i < insights.risk_flags.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:11, fontFamily:sansFont, display:'flex', gap:8 }}>
              <span style={{ color:C.red }}>⚠️</span> {flag}
            </div>
          ))}
        </div>}
        {insights.suggested_actions && insights.suggested_actions.length > 0 && <div>
          <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Suggested Actions</div>
          {insights.suggested_actions.map((action: string, i: number) => (
            <div key={i} style={{ padding:'6px 0', borderBottom: i < insights.suggested_actions.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:11, fontFamily:sansFont, display:'flex', gap:8 }}>
              <span style={{ color:C.green }}>→</span> {action}
            </div>
          ))}
        </div>}
      </div>}
    </div>;
  }

  function renderCommodities(s: any) {
    const commodities = s.commodities || [];
    const sectors = s.sector_summary || {};
    const macro = s.macro_factors || {};
    const catalysts = s.upcoming_catalysts || [];
    const topPlays = s.top_conviction_plays || [];

    return <div>
      {s.market_overview && <div style={{ padding:'16px 20px', background:`${C.gold}08`, border:`1px solid ${C.gold}20`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{s.market_overview}</div>}

      {s.dxy_context && <div style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase' }}>DXY</span>
          <span style={{ color:C.bright, fontSize:16, fontWeight:700, fontFamily:font }}>{s.dxy_context.price}</span>
          <span style={{ color:changeColor(s.dxy_context.change), fontSize:13, fontWeight:600, fontFamily:font }}>{s.dxy_context.change}</span>
        </div>
        <span style={{ color:trendColor(s.dxy_context.trend), fontSize:12, fontFamily:font }}>{s.dxy_context.trend}</span>
        <span style={{ color:C.dim, fontSize:11, fontFamily:sansFont, flex:1 }}>{s.dxy_context.impact}</span>
      </div>}

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:10 }}>
        {commodities.map((c: any, i: number) => {
          const isExp = expandedTicker === `comm-${i}`;
          return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `comm-${i}`)} expanded={isExp}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ color:C.gold, fontWeight:800, fontSize:15, fontFamily:font }}>{c.name}</span>
                <span style={{ color:C.bright, fontSize:16, fontWeight:700, fontFamily:font }}>{c.price}</span>
                <span style={{ color:changeColor(c.change_today), fontWeight:600, fontSize:13, fontFamily:font }}>{c.change_today}</span>
              </div>
              <Badge color={convColor(c.conviction)}>{c.conviction}</Badge>
            </div>
            <div style={{ padding:'0 18px 10px', display:'flex', gap:16, fontSize:11, fontFamily:font }}>
              <span style={{ color:C.dim }}>1W: <span style={{ color:changeColor(c.change_1w), fontWeight:600 }}>{c.change_1w}</span></span>
              <span style={{ color:C.dim }}>1M: <span style={{ color:changeColor(c.change_1m), fontWeight:600 }}>{c.change_1m}</span></span>
              <span style={{ color:C.dim }}>Short: <span style={{ color:trendColor(c.trend_short) }}>{c.trend_short}</span></span>
              <span style={{ color:C.dim }}>Long: <span style={{ color:trendColor(c.trend_long) }}>{c.trend_long}</span></span>
            </div>
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:10 }}>
                <IndicatorPill label="RSI" value={c.rsi} signal={c.rsi > 70 ? 'Overbought ⚠️' : c.rsi < 30 ? 'Oversold' : 'Neutral'} />
                <IndicatorPill label="50 SMA" value="—" signal={c.above_50_sma ? 'Price Above ↑' : 'Price Below ↓'} />
                <IndicatorPill label="200 SMA" value="—" signal={c.above_200_sma ? 'Price Above ↑' : 'Price Below ↓'} />
                <IndicatorPill label="Volume" value="—" signal={c.volume_signal} />
              </div>
              {c.key_levels && <div style={{ padding:10, background:C.bg, borderRadius:8, border:`1px solid ${C.border}`, marginBottom:12, color:C.text, fontSize:11, fontFamily:font }}>{c.key_levels}</div>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}12`, borderRadius:8, padding:12 }}>
                  <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, marginBottom:6, textTransform:'uppercase' }}>Drivers</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.6, fontFamily:sansFont }}>{c.drivers}</div>
                </div>
                <div style={{ background:`${C.red}06`, border:`1px solid ${C.red}12`, borderRadius:8, padding:12 }}>
                  <div style={{ color:C.red, fontSize:10, fontWeight:700, fontFamily:font, marginBottom:6, textTransform:'uppercase' }}>Risks</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.6, fontFamily:sansFont }}>{c.risks}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:11 }}>
                {c.related_etfs && <div style={{ fontFamily:font }}><span style={{ color:C.dim }}>Trade via: </span><span style={{ color:C.blue, fontWeight:600 }}>{c.related_etfs}</span></div>}
                {c.sentiment && <div style={{ fontFamily:font }}><span style={{ color:C.dim }}>Sentiment: </span><span style={{ color:C.bright }}>{c.sentiment}</span></div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {c.outlook_3m && <div style={{ background:C.bg, borderRadius:8, padding:10, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.blue, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>3-Month Outlook</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{c.outlook_3m}</div>
                </div>}
                {c.outlook_12m && <div style={{ background:C.bg, borderRadius:8, padding:10, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.purple, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>12-Month Outlook</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{c.outlook_12m}</div>
                </div>}
              </div>
            </div>}
          </CardWrap>;
        })}
      </div>

      {Object.keys(sectors).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Commodity Sectors</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
          {Object.entries(sectors).map(([key, sec]: [string, any]) => (
            <div key={key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:12 }}>
              <div style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>{key.replace(/_/g, ' ')}</div>
              <StatRow label="Trend" value={sec.trend} />
              <StatRow label="Leader" value={sec.leader} />
              <StatRow label="Laggard" value={sec.laggard} />
            </div>
          ))}
        </div>
      </div>}

      {Object.keys(macro).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Macro Factors Affecting Commodities</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8 }}>
          {Object.entries(macro).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g, ' ')} value={v as string} />)}
        </div>
      </div>}

      {catalysts.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Upcoming Catalysts</div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          {catalysts.map((cat: string, i: number) => (
            <div key={i} style={{ padding:'6px 0', borderBottom: i < catalysts.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:12, fontFamily:sansFont, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:C.gold, fontSize:10 }}>📅</span> {cat}
            </div>
          ))}
        </div>
      </div>}

      {topPlays.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Top Commodity Plays</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {topPlays.map((play: any, i: number) => (
            <div key={i} style={{ background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:10, padding:14, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <span style={{ color:C.bright, fontWeight:700, fontSize:14, fontFamily:font }}>{play.asset}</span>
                  <Badge color={play.direction === 'Long' ? C.green : C.red}>{play.direction}</Badge>
                  <Badge color={convColor(play.conviction)}>{play.conviction}</Badge>
                </div>
                <div style={{ color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont }}>{play.thesis}</div>
              </div>
            </div>
          ))}
        </div>
      </div>}
    </div>;
  }

  function renderSectorRotation(s: any) {
    const sectors = s.sectors || [];
    return <div>
      {s.summary && <div style={{ padding:'14px 18px', background:`${C.blue}08`, border:`1px solid ${C.blue}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{s.summary}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10, marginBottom:10 }}>
        {sectors.map((sec: any, i: number) => {
          const isPos = parseFloat(sec.change_today) >= 0;
          return <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <div>
                <span style={{ color:C.blue, fontWeight:700, fontSize:13, fontFamily:font }}>{sec.etf}</span>
                <span style={{ color:C.dim, fontSize:11, marginLeft:8 }}>{sec.sector}</span>
              </div>
              <Badge color={convColor(sec.conviction)}>{sec.conviction}</Badge>
            </div>
            <div style={{ color:isPos ? C.green : C.red, fontSize:18, fontWeight:700, fontFamily:font, marginBottom:6 }}>{sec.change_today}</div>
            <StatRow label="RSI" value={String(sec.rsi)} />
            <StatRow label="Trend" value={sec.trend} />
            <StatRow label="vs SPY" value={sec.vs_spy} />
            <div style={{ marginTop:8, color:trendColor(sec.signal), fontSize:11, fontWeight:600, fontFamily:sansFont }}>{sec.signal}</div>
          </div>;
        })}
      </div>
      {s.rotation_signal && <div style={{ padding:'14px 18px', background:`${C.gold}08`, border:`1px solid ${C.gold}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}><span style={{ color:C.gold, fontWeight:700 }}>Rotation Signal: </span>{s.rotation_signal}</div>}
      {s.macro_context && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8 }}>
        {Object.entries(s.macro_context).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g, ' ')} value={v as string} />)}
      </div>}
    </div>;
  }

  function renderEarningsCatalyst(s: any) {
    const upcoming = s.upcoming || [];
    return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {upcoming.map((e: any, i: number) => {
        const isExp = expandedTicker === `earn-${i}`;
        return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `earn-${i}`)} expanded={isExp}>
          <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{e.ticker}</span>
              <span style={{ color:C.dim, fontSize:12 }}>{e.company}</span>
              <Badge color={C.gold}>{e.earnings_date} ({e.days_away}d)</Badge>
            </div>
            <Badge color={C.dim}>{e.market_cap}</Badge>
          </div>
          {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Estimates</div>
                <StatRow label="EPS Estimate" value={e.eps_estimate} color={C.bright} />
                <StatRow label="Revenue Est." value={e.revenue_estimate} color={C.bright} />
                <StatRow label="Beat Streak" value={e.beat_streak} />
                <StatRow label="Avg Move" value={e.avg_move_on_earnings} />
                <StatRow label="Implied Move" value={e.implied_move} />
              </div>
              <div>
                <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Setup</div>
                <StatRow label="Sentiment" value={e.sentiment} />
                <StatRow label="Pre-Earnings" value={e.pre_earnings_trend} />
                <StatRow label="Risk Level" value={e.risk_level} />
              </div>
            </div>
            {e.play && <div style={{ marginTop:14, padding:12, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, color:C.bright, fontSize:12, fontWeight:600, fontFamily:sansFont }}>{e.play}</div>}
          </div>}
        </CardWrap>;
      })}
    </div>;
  }

  const knownTypes = ['trades','investments','fundamentals','technicals','analysis','dashboard','sector_rotation','earnings_catalyst','commodities','portfolio','briefing','crypto','trending','screener'];

  function renderAssistantMessage(msg: {role: string, content: string, parsed?: any}) {
    const s = msg.parsed?.structured || (msg.parsed?.display_type ? msg.parsed : {});
    const displayType = s.display_type;
    const analysisText = msg.parsed?.analysis || msg.parsed?.message || msg.content;
    return <div>
      {displayType === 'trades' && renderTrades(s)}
      {displayType === 'investments' && renderInvestments(s)}
      {displayType === 'fundamentals' && renderFundamentals(s)}
      {displayType === 'technicals' && renderTechnicals(s)}
      {displayType === 'analysis' && renderAnalysis(s)}
      {displayType === 'trending' && renderTrades(s)}
      {displayType === 'screener' && renderScreener(s)}
      {displayType === 'crypto' && renderCrypto(s)}
      {displayType === 'briefing' && renderBriefing(s)}
      {displayType === 'portfolio' && renderPortfolio(s)}
      {displayType === 'commodities' && renderCommodities(s)}
      {displayType === 'sector_rotation' && renderSectorRotation(s)}
      {displayType === 'earnings_catalyst' && renderEarningsCatalyst(s)}
      {(displayType === 'chat' || !knownTypes.includes(displayType)) && <div style={{ padding:22, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont }} dangerouslySetInnerHTML={{ __html: formatAnalysis(analysisText) }} />}
      {displayType && displayType !== 'chat' && knownTypes.includes(displayType) && analysisText && <div style={{ marginTop:16, padding:22, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont }} dangerouslySetInnerHTML={{ __html: formatAnalysis(analysisText) }} />}
    </div>;
  }

  const promptGroups = [
    { id: 'g1', title: '🎯 All-Encompassing', buttons: [
      {l:'🔥 Trending Now', p:'What\'s trending across all markets right now? Show me the highest-conviction stocks, crypto, and commodities that are buzzing with real catalysts — not just hype. Apply the full top-down workflow: verify news, check sector alignment, filter for best setups.'},
      {l:'✦ Daily Briefing', p:'Give me today\'s market intelligence briefing. Cover macro regime, sector positioning, top trade setups, top investment ideas, and key risks. What should I be paying attention to today?'},
      {l:'🔥 Best Trades', p:'What are the best short-term trade setups right now across stocks, crypto, and commodities? I want high risk/reward setups with clear entry, stop, and targets. Apply the full top-down workflow — only show me trades in sectors with tailwinds.'},
      {l:'💎 Best Investments', p:'What are the best long-term investment opportunities right now? Find undervalued companies with improving fundamentals, strong moats, and secular tailwinds. SQGLP framework. Apply the top-down workflow — only recommend investments in sectors with macro support.'},
      {l:'🌍 Macro Overview', p:'Give me a comprehensive macro overview. Fed stance, rate trajectory, inflation data, yield curve, DXY, VIX, credit spreads, Fear & Greed. What regime are we in? What sectors and asset classes benefit from the current environment? What should I avoid?'},
    ]},
    { id: 'g2', title: '🏛 Sectors', buttons: [
      {l:'🔄 Sector Rotation', p:'Run a full sector rotation analysis. Which stock sectors, commodity groups, and crypto segments are seeing the strongest inflows right now? Rank them by momentum. For the top 3 sectors, give me the best individual plays. For the bottom 3, tell me what to avoid. What timeframe does this rotation favor — weeks or months? Use Weinstein stages, volume flows, macro alignment, and sentiment to support your analysis.'},
      {l:'🪙 Crypto', p:'Scan the crypto market. What\'s the macro setup for crypto right now (BTC dominance, total market cap trend, funding rates, fear/greed)? Which crypto sectors are leading (L1s, DeFi, AI coins, meme coins)? Give me the best trade and investment setups in crypto right now. Apply the full workflow — only recommend coins with real catalysts and favorable technicals.'},
      {l:'⚡ Energy', p:'Scan the energy sector for the best opportunities. Cover oil & gas, renewables, utilities, nuclear, and energy infrastructure. What\'s driving energy right now (demand growth, AI power needs, geopolitics, regulation)? Find me the best trade setups and investment opportunities in energy. What are the bottleneck plays?'},
      {l:'🤖 AI/Compute', p:'Scan the AI and compute sector. Cover chip makers, cloud infrastructure, AI software, data centers, cooling, and power infrastructure for AI. What\'s the current demand/supply dynamic? Where is the bottleneck? Find me the best setups — both the obvious leaders and the under-the-radar plays. What\'s overvalued and what\'s still cheap?'},
      {l:'🏗 Materials', p:'Scan the materials and mining sector. Cover steel, copper, lithium, rare earths, and industrial metals. What\'s driving demand (infrastructure, EVs, AI data centers, defense)? Which materials are in supply deficit? Find me the best trade and investment setups in materials right now.'},
      {l:'🔬 Quantum', p:'Scan quantum computing and related stocks. Who are the pure-play quantum companies? Who are the adjacent beneficiaries (cryo cooling, specialized chips, defense/intelligence)? Is this sector investable yet or still speculative? What\'s the best way to get exposure with favorable risk/reward?'},
      {l:'🛡 Aerospace/Defense', p:'Scan the aerospace and defense sector. What\'s driving spending (geopolitics, NATO commitments, space, drones, hypersonics)? Who has the best order backlog? Find me defense stocks with improving fundamentals, strong technicals, and upcoming catalysts. What\'s the best risk/reward in this sector right now?'},
      {l:'💻 Tech', p:'Scan the broader technology sector beyond AI. Cover cybersecurity, SaaS, fintech, semiconductors, consumer tech. What sub-sectors within tech are showing relative strength? What\'s cheap? What has momentum? Give me the best trade and investment setups in tech right now.'},
      {l:'🏦 Finance', p:'Scan the financial sector. Cover banks, insurance, asset managers, fintech, and crypto-adjacent financials. How does the rate environment affect each sub-sector? Who benefits from the current yield curve? Find me the best setups in financials — both value plays and momentum plays.'},
      {l:'🛢 Commodities', p:'Run a full commodities dashboard. Cover oil, natural gas, gold, silver, copper, uranium, lithium, agricultural commodities. Which commodities are in breakout mode? Which are oversold? What\'s the macro backdrop (dollar, rates, supply/demand)? Give me the best commodity trades and the best commodity-producer stocks right now.'},
      {l:'💊 Healthcare', p:'Scan the healthcare sector. Cover biotech, pharma, medical devices, healthcare services, and health insurance. Any major FDA catalysts coming up? What\'s cheap with improving pipelines? What has technical breakout setups? Find me the best trade and investment opportunities in healthcare.'},
      {l:'🏠 Real Estate', p:'Scan the real estate sector. Cover REITs (residential, commercial, data center, industrial), homebuilders, and real estate services. How do current rates affect the sector? Who benefits if rates come down? What\'s the best risk/reward setup in real estate right now? Any data center REITs benefiting from AI demand?'},
      {l:'☢️ Uranium/Nuclear', p:'Deep dive into the uranium and nuclear sector. Cover uranium miners, nuclear utilities, enrichment companies, and SMR plays. What\'s the supply/demand picture for uranium? What contracts are coming up? Give me the best trade and investment setups in the nuclear renaissance theme.'},
    ]},
    { id: 'g3', title: '📊 Technical Analysis', buttons: [
      {l:'📈 Stage 2 Breakouts', p:'Find stocks, crypto, and commodities breaking into Weinstein Stage 2 right now — price moving above a rising 200-day SMA with above-average volume. These are the early-stage uptrends. Only show me setups where fundamentals also support the breakout.'},
      {l:'🔻 Bearish Setups', p:'Find the weakest stocks, crypto, and commodities right now. Stage 4 breakdowns, death crosses, bearish pattern breakouts, deteriorating fundamentals. What should I be avoiding or shorting? What looks like a value trap?'},
      {l:'⚡ Asymmetric Only', p:'Find the most asymmetric risk/reward setups across stocks, crypto, and commodities right now. I want compressed valuations with upcoming catalysts — setups where the downside is limited but the upside is 3x or more. Tight stops, big potential.'},
      {l:'🐣 Small Cap Spec', p:'Find the best speculative small cap and micro cap opportunities right now — stocks under $2B market cap with explosive potential. High risk, high reward. Volume surges, catalyst-driven, momentum plays. What small caps are institutional money starting to notice?'},
      {l:'💥 Short Squeeze', p:'Find the best short squeeze candidates across stocks and crypto. High short interest (>20%), low float, rising cost to borrow, utilization near 100%, plus a catalyst that could force covering. What\'s set up for a squeeze right now?'},
      {l:'🟢 Bullish Breakouts', p:'Find stocks, crypto, and commodities with confirmed bullish pattern breakouts — cup and handle, ascending triangle, bull flag, inverse head and shoulders, channel breakout. Only include breakouts confirmed by volume. What\'s breaking out RIGHT NOW with real momentum?'},
      {l:'🔴 Bearish Breakdowns', p:'Find stocks, crypto, and commodities with confirmed bearish pattern breakdowns — head and shoulders, descending triangle, bear flag, rising wedge breakdown. What\'s breaking down with increasing volume? These are warns or short candidates.'},
      {l:'📉 Oversold Bounces', p:'Find stocks, crypto, and commodities that are deeply oversold near key support levels — RSI below 30, near 200-day SMA, at major support, but in sectors that still have favorable macro tailwinds. These are dip-buy candidates where the uptrend is intact. Pullbacks in uptrends, not falling knives.'},
      {l:'📈 Overbought Warnings', p:'Find stocks, crypto, and commodities that are extremely overbought — RSI above 70, extended above Bollinger Bands, far above moving averages. These are candidates for a pullback or mean reversion. What should I take profits on or avoid chasing?'},
      {l:'🔀 Crossover Signals', p:'Find stocks, crypto, and commodities with fresh moving average crossovers in the last 5 days — golden crosses (50 above 200 SMA), death crosses (50 below 200 SMA), fresh bullish or bearish EMA crossovers, and fresh MACD signal line crossovers. What just triggered a new trend signal?'},
      {l:'🚀 Momentum Shifts', p:'Find stocks, crypto, and commodities showing early momentum shifts — MACD histogram turning positive after being negative, RSI crossing above 50 from below, early bullish or bearish momentum inflections. What\'s about to start moving before the crowd notices?'},
      {l:'📏 Trend Status', p:'Give me a trend status report across markets. What stocks, crypto, and commodities are in strong uptrends vs strong downtrends vs trading in range? What just shifted from downtrend to uptrend (trend upgrades)? What\'s losing its uptrend? This is the Weinstein stage map of the market.'},
      {l:'🔊 Volume & Movers', p:'Find the biggest volume spikes and price movers across stocks, crypto, and commodities today. Unusual volume (2x+ average), new local highs, new local lows, top gainers, top losers. What\'s moving on heavy volume and WHY? Separate the signal from the noise.'},
    ]},
    { id: 'g4', title: '📋 Fundamental Analysis', buttons: [
      {l:'🏆 Fundamental Leaders', p:'Find stocks with the strongest fundamentals across all sectors — highest ROIC, best margins, fastest revenue growth, cleanest balance sheets, strongest free cash flow. These are the highest-quality businesses in the market. Now filter: which of these are also in technically favorable positions and not overvalued?'},
      {l:'📈 Rapidly Improving Fundamentals', p:'Find stocks where fundamentals are rapidly improving — revenue growth accelerating, margins expanding, EBITDA turning positive, EPS beats increasing, guidance being raised. These are turnaround stories and inflection points. The key is TRAJECTORY, not current absolute numbers. What\'s getting better fastest?'},
      {l:'📅 Earnings Watch', p:'What are the most important earnings reports coming up in the next 2 weeks? For each, give me: what the market expects, what would be a beat/miss catalyst, how the stock is positioned technically going into earnings, and whether I should hold through or trade around it. Focus on names that could move big.'},
    ]},
    { id: 'g5', title: '📡 Buzz', buttons: [
      {l:'🚀 Social Momentum', p:'What stocks, crypto, and commodities have the highest social momentum right now? Cross-reference X/Twitter, StockTwits, Reddit, and Finviz. What\'s buzzing across multiple platforms simultaneously? For each, tell me: is the buzz backed by a real catalyst or is it noise? Is this an entry or a trap?'},
      {l:'📰 News Headline Leaders', p:'What stocks, crypto, and commodities are dominating the news cycle right now? Major headlines, breaking developments, analyst upgrades/downgrades, insider transactions, regulatory actions. For each headline-driven mover, assess: is the move done or just starting? Is this a trade or does it change the long-term thesis?'},
      {l:'🎯 Upcoming Catalysts', p:'What are the biggest upcoming catalysts across markets in the next 1-4 weeks? Earnings dates, FDA decisions, FOMC meetings, CPI/jobs data, product launches, contract announcements, ex-dividend dates, index rebalancing. For each, which stocks are most affected and how should I position?'},
    ]},
  ];

  function toggleAllGroups() {
    const newState = !allGroupsVisible;
    setAllGroupsVisible(newState);
    setGroupExpanded({ g1: newState, g2: newState, g3: newState, g4: newState, g5: newState });
  }

  function toggleGroup(id: string) {
    setGroupExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function renderPromptGroups() {
    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <button onClick={toggleAllGroups} style={{ padding:'7px 14px', background: allGroupsVisible ? `${C.blue}12` : C.card, border:`1px solid ${allGroupsVisible ? C.blue+'40' : C.border}`, borderRadius:8, color: allGroupsVisible ? C.blue : C.dim, fontSize:11, cursor:'pointer', fontFamily:font, transition:'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.bright; }} onMouseLeave={e => { e.currentTarget.style.borderColor = allGroupsVisible ? C.blue+'40' : C.border; e.currentTarget.style.color = allGroupsVisible ? C.blue : C.dim; }}>
            {allGroupsVisible ? '▾ Hide All Prompts' : '▸ Show All Prompts'}
          </button>
        </div>
        {promptGroups.map(group => (
          <div key={group.id} style={{ marginBottom: 8 }}>
            <button onClick={() => toggleGroup(group.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background:'transparent', border:'none', color: groupExpanded[group.id] ? C.bright : C.dim, fontSize:12, cursor:'pointer', fontFamily:font, transition:'all 0.15s', fontWeight:700 }} onMouseEnter={e => { e.currentTarget.style.color = C.bright; }} onMouseLeave={e => { e.currentTarget.style.color = groupExpanded[group.id] ? C.bright : C.dim; }}>
              <span style={{ fontSize:8, transform: groupExpanded[group.id] ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform 0.2s', display:'inline-block' }}>▶</span>
              {group.title}
            </button>
            {groupExpanded[group.id] && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, paddingLeft:6, marginTop:4 }}>
                {group.buttons.map(q => (
                  <button key={q.l} onClick={() => { newChat(); askAgent(q.p, true); }} disabled={loading} style={{ padding:'8px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.dim, fontSize:11, cursor:loading?'not-allowed':'pointer', fontFamily:font, transition:'all 0.15s', whiteSpace:'nowrap', flex:'0 0 auto' }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.bright; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}>{q.l}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', fontFamily:sansFont, width:'100%', padding:'0 12px', boxSizing:'border-box' as const }}>
      <div style={{ marginBottom:10 }}>
        {showPrompts ? (
          <>
            {renderPromptGroups()}
            <div style={{ marginTop:10, padding:14, background:`linear-gradient(135deg, ${C.bg} 0%, #0e0f14 100%)`, border:`1px solid ${C.purple}20`, borderRadius:12, borderTop:`1px solid ${C.purple}30` }}>
              <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                <textarea
                  value={screenerInput}
                  onChange={e => setScreenerInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (screenerInput.trim()) askAgent(screenerInput); setScreenerInput(''); } }}
                  placeholder="Screen for stocks... e.g. 'Small caps under $2B, revenue growth >30%, positive EBITDA, RSI under 40, insider buying in last 30 days'"
                  rows={2}
                  style={{ flex:1, padding:'10px 14px', border:`1px solid ${C.border}`, borderRadius:8, background:C.card, color:C.bright, fontSize:16, fontFamily:sansFont, outline:'none', resize:'none', lineHeight:1.5 }}
                />
                <button
                  onClick={() => { if (screenerInput.trim()) { askAgent(screenerInput); setScreenerInput(''); } }}
                  disabled={loading || !screenerInput.trim()}
                  style={{ padding:'10px 20px', background: loading || !screenerInput.trim() ? C.card : `linear-gradient(135deg, ${C.purple}, #7c3aed)`, color: loading || !screenerInput.trim() ? C.dim : 'white', border:'none', borderRadius:8, cursor: loading || !screenerInput.trim() ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:13, fontFamily:sansFont, alignSelf:'flex-end' }}
                >
                  Scan
                </button>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                {[
                  {l:'Oversold + Growing', v:'Stocks with RSI under 35, revenue growth >20%, above SMA200, avg volume >300K'},
                  {l:'Value + Momentum', v:'P/E under 20, revenue growth >15%, above SMA50 and SMA200, relative volume >1.5x'},
                  {l:'Insider + Breakout', v:'Insider buying last 30 days, above SMA50 and SMA200, unusual volume, market cap under $10B'},
                  {l:'High Growth Small Cap', v:'Market cap under $2B, revenue growth >30%, EPS growth >25%, positive margins'},
                  {l:'Dividend Value', v:'Dividend yield >3%, P/E under 20, debt to equity under 0.5, market cap over $2B'},
                  {l:'Short Squeeze Setup', v:'Short float >15%, RSI under 40, above SMA50, unusual volume, market cap under $5B'},
                ].map(chip => (
                  <button key={chip.l} onClick={() => setScreenerInput(chip.v)} style={{ padding:'4px 10px', background:`${C.purple}08`, border:`1px solid ${C.purple}18`, borderRadius:20, color:C.dim, fontSize:9, fontWeight:600, fontFamily:font, cursor:'pointer', transition:'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.color = C.bright; }} onMouseLeave={e => { e.currentTarget.style.borderColor = `${C.purple}18`; e.currentTarget.style.color = C.dim; }}>{chip.l}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <button onClick={() => setShowScansExpanded(!showScansExpanded)} style={{ padding:'8px 14px', background: showScansExpanded ? `${C.blue}15` : C.card, border:`1px solid ${showScansExpanded ? C.blue : C.border}`, borderRadius:8, color: showScansExpanded ? C.blue : C.dim, fontSize:11, cursor:'pointer', fontFamily:font, transition:'all 0.15s', whiteSpace:'nowrap' }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.bright; }} onMouseLeave={e => { if (!showScansExpanded) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; } }}>{showScansExpanded ? '▾ Hide Scans' : '▸ Show Scans'}</button>
            {showScansExpanded && <>
              <div style={{ marginTop:8 }}>{renderPromptGroups()}</div>
              <div style={{ marginTop:10, padding:14, background:`linear-gradient(135deg, ${C.bg} 0%, #0e0f14 100%)`, border:`1px solid ${C.purple}20`, borderRadius:12, borderTop:`1px solid ${C.purple}30` }}>
                <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                  <textarea
                    value={screenerInput}
                    onChange={e => setScreenerInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (screenerInput.trim()) askAgent(screenerInput); setScreenerInput(''); } }}
                    placeholder="Screen for stocks... e.g. 'Small caps under $2B, revenue growth >30%, positive EBITDA, RSI under 40, insider buying in last 30 days'"
                    rows={2}
                    style={{ flex:1, padding:'10px 14px', border:`1px solid ${C.border}`, borderRadius:8, background:C.card, color:C.bright, fontSize:16, fontFamily:sansFont, outline:'none', resize:'none', lineHeight:1.5 }}
                  />
                  <button
                    onClick={() => { if (screenerInput.trim()) { askAgent(screenerInput); setScreenerInput(''); } }}
                    disabled={loading || !screenerInput.trim()}
                    style={{ padding:'10px 20px', background: loading || !screenerInput.trim() ? C.card : `linear-gradient(135deg, ${C.purple}, #7c3aed)`, color: loading || !screenerInput.trim() ? C.dim : 'white', border:'none', borderRadius:8, cursor: loading || !screenerInput.trim() ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:13, fontFamily:sansFont, alignSelf:'flex-end' }}
                  >
                    Scan
                  </button>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                  {[
                    {l:'Oversold + Growing', v:'Stocks with RSI under 35, revenue growth >20%, above SMA200, avg volume >300K'},
                    {l:'Value + Momentum', v:'P/E under 20, revenue growth >15%, above SMA50 and SMA200, relative volume >1.5x'},
                    {l:'Insider + Breakout', v:'Insider buying last 30 days, above SMA50 and SMA200, unusual volume, market cap under $10B'},
                    {l:'High Growth Small Cap', v:'Market cap under $2B, revenue growth >30%, EPS growth >25%, positive margins'},
                    {l:'Dividend Value', v:'Dividend yield >3%, P/E under 20, debt to equity under 0.5, market cap over $2B'},
                    {l:'Short Squeeze Setup', v:'Short float >15%, RSI under 40, above SMA50, unusual volume, market cap under $5B'},
                  ].map(chip => (
                    <button key={chip.l} onClick={() => setScreenerInput(chip.v)} style={{ padding:'4px 10px', background:`${C.purple}08`, border:`1px solid ${C.purple}18`, borderRadius:20, color:C.dim, fontSize:9, fontWeight:600, fontFamily:font, cursor:'pointer', transition:'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.color = C.bright; }} onMouseLeave={e => { e.currentTarget.style.borderColor = `${C.purple}18`; e.currentTarget.style.color = C.dim; }}>{chip.l}</button>
                  ))}
                </div>
              </div>
            </>}
          </div>
        )}
      </div>

      <div style={{ marginBottom:12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom:12 }}>
            {msg.role === 'user' ? (
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <div style={{ maxWidth:'80%', padding:'12px 18px', background:`${C.purple}10`, border:`1px solid ${C.purple}20`, borderRadius:'16px 16px 4px 16px', color:C.bright, fontSize:13, fontFamily:sansFont, lineHeight:1.6 }}>{msg.content}</div>
              </div>
            ) : (
              <div style={{ width:'100%' }}>
                {renderAssistantMessage(msg)}
              </div>
            )}
          </div>
        ))}

        {loading && <div style={{ textAlign:'center', padding:60, color:C.dim }}>
          <div style={{ width:32, height:32, margin:'0 auto 16px', border:`3px solid ${C.border}`, borderTopColor:C.blue, borderRadius:'50%', animation:'agent-spin 0.7s linear infinite' }} />
          <div style={{ fontSize:13, color:C.text, fontFamily:sansFont, marginBottom:4 }}>{loadingStage}</div>
          <div style={{ fontSize:10, color:C.dim, fontFamily:font }}>Polygon · Finviz · StockTwits · Finnhub · EDGAR · FRED · Alpha Vantage · CNN F&G</div>
          <div style={{ width:200, height:3, background:C.border, borderRadius:2, margin:'16px auto 0', overflow:'hidden' }}>
            <div style={{ height:'100%', background:`linear-gradient(90deg, ${C.blue}, ${C.purple})`, borderRadius:2, animation:'agent-progress 14s ease-in-out forwards' }} />
          </div>
        </div>}

        <div ref={scrollAnchorRef} />
      </div>

      <div>
        <div style={{ display:'flex', gap:8 }}>
          <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAgent()} placeholder={messages.length > 0 ? "Ask a follow-up..." : "Best trades today... Review NVDA, AMD, PLTR... Analyze SMCI... Screen for small caps..."} style={{ flex:1, padding:'14px 18px', border:`1px solid ${C.border}`, borderRadius:10, background:C.bg, color:C.bright, fontSize:16, fontFamily:sansFont, outline:'none' }} />
          <button onClick={() => askAgent()} disabled={loading} style={{ padding:'12px 28px', background:loading ? C.card : `linear-gradient(135deg, ${C.blue}, #2563eb)`, color:loading ? C.dim : 'white', border:'none', borderRadius:10, cursor:loading?'not-allowed':'pointer', fontWeight:700, fontSize:14, fontFamily:sansFont }}>
            {loading ? 'Scanning...' : 'Analyze'}
          </button>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
          <button onClick={() => setShowChatHistory(!showChatHistory)} style={{ padding:'4px 10px', background:'transparent', border:`1px solid ${showChatHistory ? C.blue + '40' : 'transparent'}`, borderRadius:6, color: showChatHistory ? C.text : C.dim, fontSize:10, cursor:'pointer', fontFamily:font, transition:'all 0.15s', display:'flex', alignItems:'center', gap:5 }} onMouseEnter={e => { e.currentTarget.style.color = C.bright; e.currentTarget.style.borderColor = C.blue + '40'; }} onMouseLeave={e => { e.currentTarget.style.color = showChatHistory ? C.text : C.dim; e.currentTarget.style.borderColor = showChatHistory ? C.blue + '40' : 'transparent'; }}>
            <span style={{ fontSize:8, transform: showChatHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s', display:'inline-block' }}>▼</span>
            Chat History{savedChats.length > 0 ? ` (${savedChats.length})` : ''}
          </button>
          {messages.length > 0 && <button onClick={newChat} style={{ padding:'5px 14px', background:`${C.blue}12`, border:`1px solid ${C.blue}30`, borderRadius:6, color:C.blue, fontSize:10, cursor:'pointer', fontFamily:font, fontWeight:600, transition:'all 0.15s', display:'flex', alignItems:'center', gap:5 }} onMouseEnter={e => { e.currentTarget.style.background = `${C.blue}22`; e.currentTarget.style.borderColor = C.blue; }} onMouseLeave={e => { e.currentTarget.style.background = `${C.blue}12`; e.currentTarget.style.borderColor = `${C.blue}30`; }}>
            <span style={{ fontSize:13, lineHeight:1 }}>+</span> New Chat
          </button>}
        </div>
        {showChatHistory && (
          <div style={{ marginTop:6, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, maxHeight:250, overflowY:'auto' }}>
            <div style={{ padding:'8px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:C.bright, fontSize:11, fontWeight:700, fontFamily:font }}>Saved Chats</span>
              {savedChats.length > 0 && <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>{savedChats.length} conversation{savedChats.length !== 1 ? 's' : ''}</span>}
            </div>
            {savedChats.length === 0 ? (
              <div style={{ padding:'20px 14px', color:C.dim, fontSize:11, fontFamily:font, textAlign:'center' }}>No saved chats yet. Start a conversation and click "New Chat" to save it and start fresh.</div>
            ) : (
              savedChats.map(chat => (
                <div key={chat.id} style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', transition:'background 0.1s' }} onMouseEnter={e => { e.currentTarget.style.background = `${C.blue}08`; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <div onClick={() => loadChat(chat)} style={{ flex:1, minWidth:0 }}>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:C.text, fontSize:11, fontFamily:font, fontWeight:500 }}>{chat.title}</div>
                    <div style={{ color:C.dim, fontSize:9, fontFamily:font, marginTop:2 }}>{Math.floor(chat.messages.length / 2)} message{Math.floor(chat.messages.length / 2) !== 1 ? 's' : ''} · {new Date(chat.id).toLocaleDateString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} style={{ marginLeft:10, padding:'4px 8px', background:'transparent', border:`1px solid transparent`, borderRadius:4, color:C.dim, fontSize:10, cursor:'pointer', fontFamily:font, flexShrink:0, transition:'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = C.red + '30'; }} onMouseLeave={e => { e.currentTarget.style.color = C.dim; e.currentTarget.style.borderColor = 'transparent'; }}>✕</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes agent-spin { to { transform: rotate(360deg); } }
        @keyframes agent-progress { 0%{width:0%} 15%{width:15%} 40%{width:45%} 70%{width:70%} 90%{width:85%} 100%{width:95%} }
      `}</style>
    </div>
  );
}
