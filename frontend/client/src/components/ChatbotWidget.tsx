import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme, DARK_C } from '@/contexts/ThemeContext';
import { useLocation } from 'wouter';
import { useChatbot } from '@/contexts/ChatbotContext';
import cryptoHippoLogo from '@assets/image_1771549651056.png';
import caelynLogo from '@assets/image_1771541162366.png';
import WatchlistAnalysis, { tryParseWatchlistAnalysis } from './WatchlistAnalysis';

let C = DARK_C;
const font = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
const sansFont = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const CRYPTO_TICKERS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'DOT', 'MATIC', 'LINK', 'DOGE', 'SHIB', 'UNI', 'AAVE', 'LTC', 'NEAR', 'FTM', 'ATOM', 'APT', 'SUI', 'ARB', 'OP', 'INJ', 'TIA', 'SEI', 'JUP', 'WIF', 'PEPE', 'BONK', 'RENDER', 'FET', 'TAO', 'ONDO', 'PENDLE', 'RUNE', 'STX', 'MKR', 'CRV', 'SNX', 'COMP', 'IMX', 'GALA', 'AXS', 'SAND', 'MANA', 'FIL', 'ICP', 'HBAR', 'VET', 'ALGO', 'EGLD', 'MINA', 'KAVA', 'ROSE', 'ZEC', 'EOS', 'XLM', 'TRX', 'TON', 'WLD', 'PYTH', 'JTO', 'STRK', 'BLUR', 'ENA', 'W', 'ETHFI', 'DYM', 'ALT', 'PIXEL', 'PORTAL', 'PAXG']);

function getTVSymbol(ticker: string): string {
  const t = ticker.toUpperCase();
  if (CRYPTO_TICKERS.has(t)) return `BINANCE:${t}USDT`;
  return t;
}

function ChatboxChart({ ticker }: { ticker: string }) {
  const sym = getTVSymbol(ticker);
  const [ivl, setIvl] = useState('D');
  const intervals = [{ l: '1H', v: '60' }, { l: '4H', v: '240' }, { l: '1D', v: 'D' }, { l: '1W', v: 'W' }, { l: '1M', v: 'M' }];
  return <div style={{ margin: '8px 0' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
      <span style={{ color: C.blue, fontWeight: 700, fontSize: 11, fontFamily: font, marginRight: 4 }}>{ticker}</span>
      {intervals.map(iv => <button key={iv.v} onClick={(e) => { e.stopPropagation(); setIvl(iv.v); }} style={{ padding: '1px 6px', fontSize: 8, fontWeight: 600, fontFamily: font, background: ivl === iv.v ? C.blue + '20' : 'transparent', color: ivl === iv.v ? C.blue : C.dim, border: `1px solid ${ivl === iv.v ? C.blue + '40' : C.border}`, borderRadius: 3, cursor: 'pointer' }}>{iv.l}</button>)}
    </div>
    <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
      <iframe src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(sym)}&interval=${ivl}&theme=dark&style=1&locale=en&hide_top_toolbar=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=180`} style={{ width: '100%', height: 180, border: 'none', display: 'block' }} title={`${sym} chart`} />
    </div>
  </div>;
}

function formatChatMarkdown(text: string) {
  if (!text) return '';
  return text
    .replace(/^> (.*?)$/gm, `<div style="border-left:3px solid ${C.blue};padding:4px 10px;margin:6px 0;background:${C.blue}08;color:${C.text};font-size:11px;border-radius:0 4px 4px 0">$1</div>`)
    .replace(/^---+$/gm, `<hr style="border:none;border-top:1px solid ${C.border};margin:8px 0"/>`)
    .replace(/^### (.*?)$/gm, `<div style="color:${C.blue};font-weight:700;font-size:12px;margin:8px 0 4px;font-family:${sansFont}">$1</div>`)
    .replace(/^## (.*?)$/gm, `<div style="color:${C.bright};font-weight:700;font-size:13px;margin:10px 0 5px;font-family:${sansFont}">$1</div>`)
    .replace(/^# (.*?)$/gm, `<div style="color:${C.bright};font-weight:800;font-size:14px;margin:12px 0 6px;font-family:${sansFont}">$1</div>`)
    .replace(/\*\*(.*?)\*\*/g, `<span style="color:${C.bright};font-weight:700">$1</span>`)
    .replace(/\*(.*?)\*/g, `<em style="color:${C.text}">$1</em>`)
    .replace(/^- (.*?)$/gm, `<div style="padding-left:12px;margin:2px 0"><span style="color:${C.dim};margin-right:6px">•</span>$1</div>`)
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, '<br/>');
}

function ChatboxMessage({ content, structured }: { content: string, structured?: any }) {
  const watchlistFromStructured = structured?.display_type === 'csv_watchlist_analysis' ? structured : null;
  const watchlistFromContent = !watchlistFromStructured ? tryParseWatchlistAnalysis(content) : null;
  const watchlistData = watchlistFromStructured || watchlistFromContent;

  if (watchlistData) {
    return <WatchlistAnalysis data={watchlistData} />;
  }

  const isChatbox = structured?.display_type === 'chatbox';
  const tickers: string[] = isChatbox ? (structured?.tickers || []) : [];

  if (isChatbox || !structured) {
    const displayText = isChatbox ? (structured?.message || content) : content;
    return <div>
      <div style={{ color: C.text, fontSize: 11, lineHeight: 1.6, fontFamily: sansFont }} dangerouslySetInnerHTML={{ __html: formatChatMarkdown(displayText) }} />
      {tickers.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {tickers.slice(0, 3).map(t => <ChatboxChart key={t} ticker={t} />)}
        </div>
      )}
    </div>;
  }

  return <div style={{ color: C.text, fontSize: 11, lineHeight: 1.6, fontFamily: sansFont }} dangerouslySetInnerHTML={{ __html: formatChatMarkdown(content) }} />;
}

// ── Page-aware prompts ────────────────────────────────────────────────────────

function normalizePage(pathname: string): string {
  const p = pathname.toLowerCase();
  if (p === '/' || p.endsWith('/home')) return 'Home';
  if (p.includes('watchlist')) return 'Watchlist';
  if (p.includes('portfolio')) return 'Portfolio';
  if (p.includes('option')) return 'Options';
  if (p.includes('hyperliquid')) return 'Hyperliquid';
  if (p.includes('theme')) return 'Themes';
  if (p.includes('chart-radar') || p.includes('multicharts')) return 'Chart Radar';
  if (p.includes('predict') || p.includes('macro') || p.includes('strategy') || p.includes('sector')) return 'Strategy';
  return 'General';
}

const PAGE_PROMPTS: Record<string, Array<{ l: string; p: string }>> = {
  'Home': [
    { l: 'What matters today?', p: 'What are the most important market developments happening right now that I need to know? Give me the key signals, regime status, and highest-conviction moves.' },
    { l: 'Top risk signal', p: 'What is the single biggest risk signal in the market right now? Check VIX, macro, sector weakness, and cross-asset divergences.' },
    { l: 'Best opportunities', p: 'What are the best trade opportunities across stocks, crypto, and macro right now? Use all available signal context.' },
    { l: 'Regime shift?', p: 'Is the current market regime shifting? Check macro indicators, sector rotation, options flow, and momentum signals for regime change evidence.' },
    { l: 'What changed?', p: 'What has changed in the market since yesterday or the last session? What moved, what broke, what surprised?' },
  ],
  'Watchlist': [
    { l: 'Best new adds', p: 'What new stocks should I consider adding to my watchlist, excluding anything already on my watchlist, using my theme preferences, current market regime, and strongest signals across the app?' },
    { l: 'Strongest names', p: 'Which names on my watchlist are showing the strongest signals right now? Rank by signal strength, momentum, and regime fit.' },
    { l: 'Theme breakouts', p: 'Which watchlist names are breaking out of or into a new theme? Show theme momentum and rotation signals.' },
    { l: 'What am I missing?', p: 'Based on my watchlist themes and current market conditions, what important names or themes am I missing that I should consider adding?' },
    { l: 'Regime-fit picks', p: 'Which of my watchlist names are the best fit for the current market regime? Show me the top picks given current macro and sector conditions.' },
  ],
  'Portfolio': [
    { l: 'Biggest risk', p: 'What is the biggest risk in my current portfolio right now? Check concentration, sector exposure, macro sensitivity, and signal deterioration.' },
    { l: 'Add or trim?', p: 'Which portfolio positions should I consider adding to, and which should I consider trimming or cutting? Use current signals, momentum, and regime context.' },
    { l: 'Concentration check', p: 'Do I have dangerous concentration risk in my portfolio? Check sector, theme, factor, and single-name exposure.' },
    { l: 'Portfolio hedges', p: 'What are the best hedges for my current portfolio given the market regime and macro backdrop? Consider options, inverse ETFs, or sector rotation.' },
    { l: 'Watchlist upgrades', p: 'Are there any names on my watchlist that should replace current portfolio positions based on relative signal strength and regime fit?' },
  ],
  'Options': [
    { l: 'Best flow setups', p: 'What are the best options flow setups right now? Show me the highest-conviction unusual activity with the strongest multi-source confirmation.' },
    { l: 'Call skew leaders', p: 'Which names are showing the strongest bullish call skew and unusual call buying right now? Include context on why the flow matters.' },
    { l: 'Put risk names', p: 'Which names have concerning put buying or bearish options flow that signals downside risk? Cross-reference with fundamentals and macro.' },
    { l: 'Portfolio options', p: 'Are there options setups on any of my watchlist or portfolio names right now? Show relevant flow and potential plays.' },
    { l: 'Unusual flow', p: 'Show me the most unusual options activity right now — large sweeps, out-of-money buys, and multi-leg structures that stand out from baseline activity.' },
  ],
  'Hyperliquid': [
    { l: 'Strongest perps', p: 'Which Hyperliquid perps look strongest right now, and are there any stock or theme readthroughs I should care about?' },
    { l: 'Overheated longs', p: 'Which Hyperliquid perps have overheated long positioning? Show funding rates, open interest, and liquidation risk.' },
    { l: 'Short squeeze risk', p: 'Are there any Hyperliquid perps with high short squeeze potential right now? Check positioning, funding, and momentum.' },
    { l: 'TSM reversals', p: 'Are there any time-series momentum reversals setting up on Hyperliquid perps? Show current TSMOM signals and setup quality.' },
    { l: 'Crypto-stock link', p: 'What are the strongest crypto-to-stock readthroughs right now? Which Hyperliquid moves have implications for equities or macro?' },
  ],
  'Themes': [
    { l: 'Breaking themes', p: 'Which market themes are breaking out or breaking down right now? Show theme momentum, rotation signals, and entry quality.' },
    { l: 'Theme leaders', p: 'Who are the strongest leaders in each active theme right now? Rank by signal strength and theme conviction.' },
    { l: 'Missing tickers', p: 'Based on the strongest themes, what tickers am I missing that I should add to my watchlist? Avoid anything already tracked.' },
    { l: 'Rotation check', p: 'Is there active rotation happening between themes right now? Where is money flowing in and out?' },
    { l: 'Best positioned', p: 'Which themes are best positioned for the current macro regime? Score each active theme for regime fit.' },
  ],
  'Strategy': [
    { l: 'Should I trade?', p: 'Given the current VIX, macro backdrop, and market regime, should I be actively trading or reducing exposure right now?' },
    { l: 'VIX signal', p: 'What is the VIX telling us about near-term market risk? Is this a buying opportunity or a warning sign?' },
    { l: 'Market regime', p: 'What is the current market regime? Risk-on, risk-off, or transitional? What signals define it and how should I position?' },
    { l: 'Risk-on/off?', p: 'Are we in a risk-on or risk-off environment right now? Show the key indicators and what changed recently.' },
    { l: 'What changed?', p: 'What has changed in the macro or strategy signals recently? What new data or developments should change my positioning?' },
  ],
  'Chart Radar': [
    { l: 'Best charts', p: 'Which visible Chart Radar names have the best technical setups right now? Use selected tickers and timeframes from this page when available, and use backend OHLCV/indicator context rather than trying to read the TradingView widget image.' },
    { l: 'Breakout setups', p: 'Which Chart Radar names are setting up for breakouts? Show volume, momentum, and technical confirmation signals.' },
    { l: 'Weakening names', p: 'Which Chart Radar names are showing technical deterioration or breakdown risk? Flag names I should reduce or avoid.' },
    { l: 'Theme leaders', p: 'Among the visible Chart Radar names, which are the strongest theme leaders right now? Use backend signal context.' },
    { l: 'Add to watchlist?', p: 'Based on the current Chart Radar view, which names showing strong setups should I add to my watchlist?' },
  ],
  'General': [
    { l: 'What matters?', p: 'What are the most important market developments right now across stocks, crypto, and macro?' },
    { l: 'Best opportunities', p: 'What are the best trade opportunities across all asset classes right now? Use all available signal and market context.' },
    { l: 'Biggest risks', p: 'What are the biggest risks in the market right now? Check macro, technicals, options flow, and cross-asset signals.' },
    { l: 'What changed?', p: 'What has changed in the market since the last session? What moved, what broke, what surprised?' },
    { l: 'Explain signals', p: 'Explain the most important signals the platform is seeing right now across stocks, crypto, macro, and options.' },
  ],
};

function getPagePrompts(pathname: string): Array<{ l: string; p: string }> {
  const page = normalizePage(pathname);
  return PAGE_PROMPTS[page] ?? PAGE_PROMPTS['General'];
}

export default function ChatbotWidget() {
  const { C: _C } = useTheme(); C = _C;
  const [location] = useLocation();
  const [mode, setMode] = useState<'collapsed' | 'small' | 'expanded'>('collapsed');
  const [input, setInput] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<any>(null);
  const { messages, isLoading, loadingStage, sendMessage, clearChat, hasUnread, setHasUnread } = useChatbot();

  // ── Drag state ────────────────────────────────────────────────────────────
  // null = default bottom-right corner (not yet dragged, or after collapse)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    isDragging.current = true;
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    e.preventDefault();
  }, [isMobile]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const panelW = panelRef.current?.offsetWidth ?? 400;
      const panelH = panelRef.current?.offsetHeight ?? 500;
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      setPos({
        x: clamp(e.clientX - dragOffset.current.x, 0, window.innerWidth - panelW),
        y: clamp(e.clientY - dragOffset.current.y, 0, window.innerHeight - panelH),
      });
    };
    const onMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Reset position to bottom-right when collapsing
  const collapse = useCallback(() => {
    setMode('collapsed');
    setPos(null);
  }, []);

  // Right-edge proximity — show fairy button only when cursor is near the right edge
  const [nearRightEdge, setNearRightEdge] = useState(false);
  const edgeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (e.clientX >= window.innerWidth - 72) {
        if (edgeHideTimer.current) { clearTimeout(edgeHideTimer.current); edgeHideTimer.current = null; }
        setNearRightEdge(true);
      } else {
        if (!edgeHideTimer.current) {
          edgeHideTimer.current = setTimeout(() => { setNearRightEdge(false); edgeHideTimer.current = null; }, 900);
        }
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); if (edgeHideTimer.current) clearTimeout(edgeHideTimer.current); };
  }, []);

  // ── Scroll / unread ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (mode !== 'collapsed') setHasUnread(false);
  }, [mode, setHasUnread]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => setIsScrolling(false), 1500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (location === '/app/hippo-ai') return null;

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  // ── Collapsed: fairy button — appears only when cursor touches the right edge ─
  if (mode === 'collapsed') {
    const btnSize = isMobile ? 80 : 100;
    return (
      <>
        <style>{`
          @keyframes chatbot-entrance {
            0% { transform: scale(1); opacity: 0.4; }
            20% { transform: scale(1.25); opacity: 1; }
            35% { transform: scale(0.95); opacity: 1; }
            50% { transform: scale(1.15); opacity: 1; }
            65% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .chatbot-btn-inner {
            animation: chatbot-entrance 1.5s ease-out 0.3s 1 both;
          }
          .chatbot-btn-inner:hover {
            transform: scale(1.6) !important;
          }
        `}</style>
        {/* Wrapper handles edge-reveal slide; inner button keeps its animation */}
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 16 : 24,
          right: isMobile ? 16 : 24,
          zIndex: 9999,
          width: btnSize,
          height: btnSize,
          opacity: nearRightEdge ? 1 : 0,
          transform: nearRightEdge ? 'translateX(0)' : `translateX(${btnSize + (isMobile ? 16 : 24) + 8}px)`,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          pointerEvents: nearRightEdge ? 'auto' : 'none',
        }}>
          <button className="chatbot-btn-inner" onClick={() => { setMode('small'); setHasUnread(false); }} style={{
            width: '100%', height: '100%',
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', position: 'relative',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5)) drop-shadow(0 0 20px rgba(139,92,246,0.25))',
          }}>
            <img src={cryptoHippoLogo} alt="Chat" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            {hasUnread && <span style={{ position:'absolute', top:2, right:2, width:12, height:12, borderRadius:'50%', background:C.green, border:`2px solid ${C.bg}` }} />}
          </button>
        </div>
      </>
    );
  }

  // ── Open panel ────────────────────────────────────────────────────────────
  const isExpanded = mode === 'expanded';
  const panelW = isMobile ? window.innerWidth : (isExpanded ? 700 : 400);
  const panelH = isMobile ? (isExpanded ? window.innerHeight : window.innerHeight * 0.6) : (isExpanded ? window.innerHeight * 0.8 : 500);
  const showChips = messages.length === 0;

  // If not yet dragged: anchor bottom-right. If dragged: use absolute x/y.
  const positionStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { bottom: isMobile ? 0 : 24, right: isMobile ? 0 : 24 };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        ...positionStyle,
        zIndex: 9999,
        width: panelW,
        height: panelH,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(11,12,16,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${C.border}`,
        borderRadius: isMobile ? (isExpanded ? 0 : '16px 16px 0 0') : 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transition: isDragging.current ? 'none' : 'box-shadow 0.2s ease-out',
        overflow: 'hidden',
        userSelect: isDragging.current ? 'none' : 'auto',
      }}
    >
      {/* ── Header (drag handle) ── */}
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          cursor: isMobile ? 'default' : 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isMobile && (
            <span style={{ color: C.dim, fontSize: 10, marginRight: 2, letterSpacing: 1 }} title="Drag to reposition">⠿</span>
          )}
          <span style={{ color: C.bright, fontSize: 13, fontWeight: 700, fontFamily: sansFont }}>Ask Caelyn</span>
          <span style={{ fontSize: 8, color: C.dim, background: C.border, padding: '2px 7px', borderRadius: 10, fontFamily: font, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>
            {normalizePage(location)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isExpanded && <button onClick={clearChat} style={{ padding:'4px 8px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:4, color:C.dim, fontSize:10, cursor:'pointer', fontFamily:font }} onMouseEnter={e => e.currentTarget.style.color = C.bright} onMouseLeave={e => e.currentTarget.style.color = C.dim}>Clear</button>}
          <button onClick={() => setMode(isExpanded ? 'small' : 'expanded')} style={{ padding:'4px 8px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:4, color:C.dim, fontSize:12, cursor:'pointer', fontFamily:font }} onMouseEnter={e => e.currentTarget.style.color = C.bright} onMouseLeave={e => e.currentTarget.style.color = C.dim}>{isExpanded ? '↙' : '↗'}</button>
          <button onClick={collapse} style={{ padding:'4px 8px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:4, color:C.dim, fontSize:12, cursor:'pointer', fontFamily:font }} onMouseEnter={e => e.currentTarget.style.color = C.red} onMouseLeave={e => e.currentTarget.style.color = C.dim}>✕</button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.dim }}>
            <img src={caelynLogo} alt="" style={{ width: 240, height: 240, margin: '0 auto 16px', opacity: 1, filter: 'brightness(1.3) drop-shadow(0 0 18px rgba(120, 200, 255, 0.45))' }} />
            <div style={{ fontSize: 13, fontFamily: sansFont, marginBottom: 4 }}>Ask me anything about markets</div>
            <div style={{ fontSize: 10, fontFamily: font }}>Stocks, crypto, macro, sectors...</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '90%',
              padding: msg.role === 'user' ? '8px 12px' : '10px 12px',
              borderRadius: 10,
              background: msg.role === 'user' ? `${C.blue}20` : C.card,
              border: `1px solid ${msg.role === 'user' ? C.blue + '30' : C.border}`,
              color: msg.role === 'user' ? C.bright : C.text,
              fontSize: 11,
              lineHeight: 1.5,
              fontFamily: sansFont,
            }}>
              {msg.role === 'user' ? msg.content : (
                <ChatboxMessage content={msg.content} structured={msg.structured} />
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:C.purple, animation:`chatbot-dot 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
              </div>
              <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>{loadingStage}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={caelynLogo} alt="" style={{ width: 200, height: 200, opacity: 0.35, filter: 'brightness(1.3) drop-shadow(0 0 14px rgba(120, 200, 255, 0.3))', animation: 'chatbot-dot 2s ease-in-out infinite' }} />
            </div>
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: 10, background: C.card }}>
        {showChips && (
          <div className="chatbot-chips-bar" style={{ display: 'flex', gap: 4, marginBottom: 8, overflowX: 'auto', paddingBottom: 0, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
            {getPagePrompts(location).map(qp => (
              <button key={qp.l} onClick={() => { sendMessage(qp.p); }} disabled={isLoading} style={{
                padding: isMobile ? '6px 12px' : '4px 10px', background: `${C.purple}08`, border: `1px solid ${C.purple}18`,
                borderRadius: 12, color: C.dim, fontSize: isMobile ? 11 : 9, fontWeight: 600, fontFamily: font,
                cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
              }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.color = C.bright; }} onMouseLeave={e => { e.currentTarget.style.borderColor = `${C.purple}18`; e.currentTarget.style.color = C.dim; }}>{qp.l}</button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about any stock, crypto, macro..."
            style={{
              flex: 1, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8,
              background: C.bg, color: C.bright, fontSize: isMobile ? 16 : 12, fontFamily: sansFont, outline: 'none',
            }}
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} style={{
            padding: '8px 16px',
            background: isLoading || !input.trim() ? C.card : `linear-gradient(135deg, ${C.blue}, #2563eb)`,
            color: isLoading || !input.trim() ? C.dim : 'white',
            border: 'none', borderRadius: 8, cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 12, fontFamily: sansFont,
          }}>Send</button>
        </div>
      </div>

      <style>{`
        @keyframes chatbot-dot { 0%, 80%, 100% { transform: scale(0.6); opacity:0.4; } 40% { transform: scale(1); opacity:1; } }
      `}</style>
    </div>
  );
}
