import { useState } from 'react';

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
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [loadingStage, setLoadingStage] = useState('');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  async function askAgent(customPrompt?: string) {
    const q = customPrompt || prompt;
    if (!q.trim()) return;
    setLoading(true); setError(null); setResult(null); setExpandedTicker(null);
    setPrompt('');

    setLoadingStage('Classifying query...');
    const stages = ['Scanning market data...','Pulling technicals & volume...','Checking social sentiment...','Analyzing insider activity...','Fetching options flow...','Reading macro indicators...','Generating analysis...'];
    let idx = 0;
    const iv = setInterval(() => { if (idx < stages.length) { setLoadingStage(stages[idx]); idx++; } }, 1600);

    try {
      const res = await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY },
        body: JSON.stringify({ prompt: q.trim(), history: chatHistory.slice(-20) }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setChatHistory(prev => [...prev, {role:'user',content:q.trim()}, {role:'assistant',content:data.analysis||''}]);
    } catch (err: any) {
      setError(err.message.includes('429') ? 'Rate limit reached. Wait a moment.' : err.message.includes('403') ? 'Auth failed.' : err.message);
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

  function CardWrap({ children, onClick, expanded }: { children: React.ReactNode, onClick?: () => void, expanded?: boolean }) {
    return <div onClick={onClick} style={{ background:C.card, border:`1px solid ${expanded ? C.blue+'40' : C.border}`, borderRadius:10, overflow:'hidden', cursor: onClick ? 'pointer' : 'default', transition:'all 0.2s' }}>{children}</div>;
  }

  function TradingViewMini({ ticker }: { ticker: string }) {
    return <div style={{ borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}`, margin:'12px 0' }}>
      <iframe src={`https://s.tradingview.com/widgetembed/?symbol=${ticker}&interval=D&theme=dark&style=1&locale=en&hide_top_toolbar=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=200`} style={{ width:'100%', height:200, border:'none', display:'block' }} title={`${ticker} chart`} />
    </div>;
  }

  function formatAnalysis(text: string) {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${C.bright}">$1</strong>`).replace(/### (.*?)(\n|$)/g, `<div style="color:${C.blue};font-weight:700;font-size:14px;margin:16px 0 8px;font-family:${sansFont}">$1</div>`).replace(/## (.*?)(\n|$)/g, `<div style="color:${C.bright};font-weight:700;font-size:16px;margin:20px 0 10px;font-family:${sansFont}">$1</div>`).replace(/\n/g, '<br/>');
  }

  function renderTrades(s: any) {
    const picks = s.picks || [];
    return <div>
      {s.market_context && <div style={{ padding:'14px 18px', background:`${C.blue}08`, border:`1px solid ${C.blue}15`, borderRadius:10, marginBottom:16, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{s.market_context}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {picks.map((p: any, i: number) => {
          const isExp = expandedTicker === `t-${i}`;
          return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `t-${i}`)} expanded={isExp}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
                <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
                <span style={{ color:changeColor(p.change), fontWeight:600, fontSize:13, fontFamily:font }}>{p.price} <span style={{ fontSize:11 }}>{p.change}</span></span>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Badge color={C.dim}>{p.market_cap}</Badge>
                <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
              </div>
            </div>
            <div style={{ padding:'0 18px 14px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont }}>{p.thesis}</div>
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:18 }}>
              <TradingViewMini ticker={p.ticker} />
              {p.ta && <div style={{ marginBottom:16 }}>
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
              {p.sentiment && <div style={{ marginBottom:16 }}>
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
    return <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {picks.map((p: any, i: number) => {
        const isExp = expandedTicker === `f-${i}`;
        const fin = p.financials || {};
        const val = p.valuation || {};
        return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `f-${i}`)} expanded={isExp}>
          <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
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
          {p.headline && <div style={{ padding:'0 18px 14px', color:C.gold, fontSize:12, fontWeight:600, fontFamily:sansFont }}>{p.headline}</div>}
          {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:18 }}>
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
    return <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {picks.map((p: any, i: number) => {
        const isExp = expandedTicker === `ta-${i}`;
        const ind = p.indicators || {};
        return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `ta-${i}`)} expanded={isExp}>
          <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
              <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
              <span style={{ color:changeColor(p.change), fontWeight:600, fontSize:13, fontFamily:font }}>{p.price} {p.change}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Badge color={C.dim}>{p.market_cap}</Badge>
              <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
            </div>
          </div>
          <div style={{ padding:'0 18px 14px', color:C.gold, fontSize:12, fontWeight:600, fontFamily:sansFont }}>{p.setup_name}</div>
          {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:18 }}>
            <TradingViewMini ticker={p.ticker} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:16 }}>
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
            {p.pattern && <div style={{ padding:12, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont, marginBottom:14 }}>{p.pattern}</div>}
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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ color:C.blue, fontWeight:800, fontSize:22, fontFamily:font }}>{s.ticker}</span>
          <span style={{ color:C.dim, fontSize:13 }}>{s.company}</span>
          <span style={{ color:changeColor(s.change), fontWeight:700, fontSize:15, fontFamily:font }}>{s.price} {s.change}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Badge color={C.dim}>{s.market_cap}</Badge>
          <Badge color={C.blue}>{s.stage}</Badge>
        </div>
      </div>
      {s.verdict && <div style={{ padding:'14px 18px', background:`${C.green}08`, border:`1px solid ${C.green}20`, borderRadius:10, marginBottom:16, color:C.bright, fontSize:13, fontWeight:600, fontFamily:sansFont }}>{s.verdict}</div>}
      {s.ticker && <TradingViewMini ticker={s.ticker} />}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:16 }}>
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
      {s.market_context && <div style={{ padding:'14px 18px', background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:10, marginBottom:16, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{s.market_context}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {picks.map((p: any, i: number) => {
          const isExp = expandedTicker === `inv-${i}`;
          const fund = p.fundamentals || {};
          const sq = p.sqglp || {};
          return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `inv-${i}`)} expanded={isExp}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
                <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
                <span style={{ color:C.bright, fontWeight:600, fontSize:13, fontFamily:font }}>{p.price}</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Badge color={C.dim}>{p.market_cap}</Badge>
                <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
              </div>
            </div>
            <div style={{ padding:'0 18px 14px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont }}>{p.investment_thesis}</div>
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:18 }}>
              {p.moat && <div style={{ padding:12, background:`${C.purple}08`, border:`1px solid ${C.purple}15`, borderRadius:8, marginBottom:14, color:C.text, fontSize:12, fontFamily:sansFont }}><span style={{ color:C.purple, fontWeight:700 }}>Moat: </span>{p.moat}</div>}
              <div style={{ marginBottom:14 }}>
                <div style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>SQGLP Assessment</div>
                {Object.entries(sq).map(([k, v]) => <StatRow key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v as string} />)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:14 }}>
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

  function renderCommodities(s: any) {
    const commodities = s.commodities || [];
    const sectors = s.sector_summary || {};
    const macro = s.macro_factors || {};
    const catalysts = s.upcoming_catalysts || [];
    const topPlays = s.top_conviction_plays || [];

    return <div>
      {s.market_overview && <div style={{ padding:'16px 20px', background:`${C.gold}08`, border:`1px solid ${C.gold}20`, borderRadius:10, marginBottom:16, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{s.market_overview}</div>}

      {s.dxy_context && <div style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase' }}>DXY</span>
          <span style={{ color:C.bright, fontSize:16, fontWeight:700, fontFamily:font }}>{s.dxy_context.price}</span>
          <span style={{ color:changeColor(s.dxy_context.change), fontSize:13, fontWeight:600, fontFamily:font }}>{s.dxy_context.change}</span>
        </div>
        <span style={{ color:trendColor(s.dxy_context.trend), fontSize:12, fontFamily:font }}>{s.dxy_context.trend}</span>
        <span style={{ color:C.dim, fontSize:11, fontFamily:sansFont, flex:1 }}>{s.dxy_context.impact}</span>
      </div>}

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
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
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:18 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:14 }}>
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

      {Object.keys(sectors).length > 0 && <div style={{ marginBottom:16 }}>
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

      {Object.keys(macro).length > 0 && <div style={{ marginBottom:16 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Macro Factors Affecting Commodities</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8 }}>
          {Object.entries(macro).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g, ' ')} value={v as string} />)}
        </div>
      </div>}

      {catalysts.length > 0 && <div style={{ marginBottom:16 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Upcoming Catalysts</div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          {catalysts.map((cat: string, i: number) => (
            <div key={i} style={{ padding:'6px 0', borderBottom: i < catalysts.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:12, fontFamily:sansFont, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:C.gold, fontSize:10 }}>📅</span> {cat}
            </div>
          ))}
        </div>
      </div>}

      {topPlays.length > 0 && <div style={{ marginBottom:16 }}>
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
      {s.summary && <div style={{ padding:'14px 18px', background:`${C.blue}08`, border:`1px solid ${C.blue}15`, borderRadius:10, marginBottom:16, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{s.summary}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10, marginBottom:16 }}>
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
      {s.rotation_signal && <div style={{ padding:'14px 18px', background:`${C.gold}08`, border:`1px solid ${C.gold}15`, borderRadius:10, marginBottom:16, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}><span style={{ color:C.gold, fontWeight:700 }}>Rotation Signal: </span>{s.rotation_signal}</div>}
      {s.macro_context && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8 }}>
        {Object.entries(s.macro_context).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g, ' ')} value={v as string} />)}
      </div>}
    </div>;
  }

  function renderEarningsCatalyst(s: any) {
    const upcoming = s.upcoming || [];
    return <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
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
          {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:18 }}>
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

  const s = result?.structured || {};

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', fontFamily:sansFont }}>
      <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex', gap:8 }}>
          <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAgent()} placeholder="Best trades today... Analyze NVDA... Best improving fundamentals..." style={{ flex:1, padding:'14px 18px', border:`1px solid ${C.border}`, borderRadius:10, background:C.bg, color:C.bright, fontSize:14, fontFamily:sansFont, outline:'none' }} />
          <button onClick={() => askAgent()} disabled={loading} style={{ padding:'12px 28px', background:loading ? C.card : `linear-gradient(135deg, ${C.blue}, #2563eb)`, color:loading ? C.dim : 'white', border:'none', borderRadius:10, cursor:loading?'not-allowed':'pointer', fontWeight:700, fontSize:14, fontFamily:sansFont }}>
            {loading ? 'Scanning...' : 'Analyze'}
          </button>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
          {[
            {l:'🔥 Best Trades', p:'Show me the best short-term trades (swing, 2-10 days) with full TA, sentiment, and trade plans. Rank by asymmetric R/R. Exclude low liquidity.'},
            {l:'💎 Best Investments', p:'Show me the best investment opportunities (3-12 month horizon) with full fundamentals, SQGLP assessment, moat analysis, and insider activity.'},
            {l:'📈 Improving Fundamentals', p:'Show me stocks with the most rapidly improving fundamentals — revenue acceleration, EBITDA margin expansion, raised guidance, earnings beats. Show me the numbers.'},
            {l:'🌍 Macro Overview', p:'Give me a full macro overview — Fed rate, inflation (CPI + Core PCE), yield curve, VIX, Fear & Greed, DXY trend, sector rotation signals. Is it risk-on or risk-off? What sectors should I favor?'},
            {l:'💥 Short Squeeze', p:'Scan for the best short squeeze setups — high short interest (>20%), low float, rising borrow cost, increasing volume, social acceleration, breakout structure.'},
          ].map(q => <button key={q.l} onClick={() => askAgent(q.p)} disabled={loading} style={{ padding:'6px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.dim, fontSize:11, cursor:loading?'not-allowed':'pointer', fontFamily:font, transition:'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.bright; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}>{q.l}</button>)}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
          {[
            {l:'🚀 Social Momentum', p:'Show me the top stocks with accelerating social media mentions and positive sentiment in the last 24-48 hours across StockTwits, Reddit, and Twitter. What is NEW and trending, not stale.'},
            {l:'📊 Volume Spikes', p:'Scan for stocks with unusual volume spikes vs 30-day average today. Show me the volume ratios and what is likely causing the spike.'},
            {l:'📅 Earnings Watch', p:'Show me upcoming earnings in the next 7 days. Rank by volatility potential, beat probability, and implied move. Include pre-earnings trend and suggested plays.'},
            {l:'🔄 Sector Rotation', p:'Show me a sector rotation analysis — which sectors are gaining institutional inflows, relative strength vs SPY, and 20-day momentum. Where should I be allocated?'},
            {l:'⚡ Asymmetric Only', p:'Only show me asymmetric setups with 4:1+ risk/reward. Compressed valuations, clear catalysts, defined floor. Show me the math on floor vs ceiling.'},
            {l:'🔻 Bearish Setups', p:'Show me the weakest stocks breaking down — Stage 3/4 transitions, deteriorating fundamentals, heavy insider selling, sector weakness. What should I avoid or hedge against?'},
            {l:'🤖 AI/Compute Check', p:'Run a momentum check on AI and compute infrastructure stocks — NVDA, AMD, AVGO, MRVL, CRDO, SMCI, VRT, ANET. Show relative strength, which are leading, which are lagging.'},
            {l:'⚛️ Uranium/Nuclear', p:'Run a momentum check on uranium and nuclear stocks — CCJ, UEC, UUUU, DNN, LEU, SMR, OKLO, VST, CEG. Show relative strength and sector trend.'},
            {l:'🎯 Small Cap Spec', p:'Scan for speculative small cap stocks (under $2B) with high volatility, increasing volume, positive sentiment, and clean breakout structure. High risk high reward.'},
            {l:'🛢️ Commodities', p:'Show me a full commodities market dashboard — oil, gold, silver, copper, uranium, natural gas. For each commodity show me price action, short and long term trends, RSI, key levels, drivers, risks, related ETFs, sentiment, and 3-month and 12-month outlook. Include DXY impact, macro factors, upcoming catalysts, and your top conviction commodity plays.'},
          ].map(q => <button key={q.l} onClick={() => askAgent(q.p)} disabled={loading} style={{ padding:'6px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.dim, fontSize:11, cursor:loading?'not-allowed':'pointer', fontFamily:font, transition:'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.bright; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}>{q.l}</button>)}
        </div>
      </div>

      {chatHistory.length > 0 && !loading && !result && <div style={{ padding:'8px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>{Math.floor(chatHistory.length/2)} messages in context</span>
        <button onClick={() => setChatHistory([])} style={{ padding:'3px 10px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:6, color:C.dim, fontSize:10, cursor:'pointer', fontFamily:font }}>Clear</button>
      </div>}

      {loading && <div style={{ textAlign:'center', padding:60, color:C.dim }}>
        <div style={{ width:32, height:32, margin:'0 auto 16px', border:`3px solid ${C.border}`, borderTopColor:C.blue, borderRadius:'50%', animation:'agent-spin 0.7s linear infinite' }} />
        <div style={{ fontSize:13, color:C.text, fontFamily:sansFont, marginBottom:4 }}>{loadingStage}</div>
        <div style={{ fontSize:10, color:C.dim, fontFamily:font }}>Polygon · Finviz · StockTwits · Finnhub · EDGAR · FRED · Alpha Vantage · CNN F&G</div>
        <div style={{ width:200, height:3, background:C.border, borderRadius:2, margin:'16px auto 0', overflow:'hidden' }}>
          <div style={{ height:'100%', background:`linear-gradient(90deg, ${C.blue}, ${C.purple})`, borderRadius:2, animation:'agent-progress 14s ease-in-out forwards' }} />
        </div>
      </div>}

      {error && <div style={{ color:C.red, padding:20, textAlign:'center', background:C.card, border:`1px solid ${C.border}`, borderRadius:10 }}>{error}</div>}

      {result && <div>
        {s.display_type === 'trades' && renderTrades(s)}
        {s.display_type === 'investments' && renderInvestments(s)}
        {s.display_type === 'fundamentals' && renderFundamentals(s)}
        {s.display_type === 'technicals' && renderTechnicals(s)}
        {s.display_type === 'analysis' && renderAnalysis(s)}
        {s.display_type === 'commodities' && renderCommodities(s)}
        {s.display_type === 'sector_rotation' && renderSectorRotation(s)}
        {s.display_type === 'earnings_catalyst' && renderEarningsCatalyst(s)}
        {(s.display_type === 'chat' || !['trades','investments','fundamentals','technicals','analysis','dashboard','sector_rotation','earnings_catalyst','commodities'].includes(s.display_type)) && <div style={{ padding:22, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont }} dangerouslySetInnerHTML={{ __html: formatAnalysis(result.analysis) }} />}
        {s.display_type !== 'chat' && result.analysis && <div style={{ marginTop:16, padding:22, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont }} dangerouslySetInnerHTML={{ __html: formatAnalysis(result.analysis) }} />}
      </div>}

      <style>{`
        @keyframes agent-spin { to { transform: rotate(360deg); } }
        @keyframes agent-progress { 0%{width:0%} 15%{width:15%} 40%{width:45%} 70%{width:70%} 90%{width:85%} 100%{width:95%} }
      `}</style>
    </div>
  );
}
