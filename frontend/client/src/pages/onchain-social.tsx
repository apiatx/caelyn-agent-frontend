import { useState, useCallback, useEffect, useRef, CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { openSecureLink } from '@/utils/security';
import socialImage from "@assets/image_1771574082445.png";

// ─── Grok Agent Constants ─────────────────────────────────────────
const AGENT_BACKEND_URL = "https://fast-api-server-trading-agent-aidanpilon.replit.app";
const AGENT_API_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";

function getToken(): string | null {
  return localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

const SUGGESTED_PROMPTS = [
  "Top stock tickers trending on X right now",
  "Which tickers have the most bullish sentiment today?",
  "What are top finance accounts saying about the market?",
  "Most discussed crypto tokens on X this week",
  "What bearish warnings are traders posting on X?",
  "Highest engagement trading posts in the last 24 hours",
  "What is X saying about Fed rate decisions?",
  "Retail sentiment vs institutional sentiment on X",
];

// ─── Sentiment color helper ───────────────────────────────────────
function renderGrokResponse(text: string) {
  if (typeof text !== 'string') text = JSON.stringify(text, null, 2);
  // Split into lines, apply color coding for sentiment words
  return text.split('\n').map((line, i) => {
    // Apply inline coloring for sentiment keywords
    const parts: Array<{ text: string; color?: string }> = [];
    let remaining = line;

    const patterns: Array<{ regex: RegExp; color: string }> = [
      { regex: /\b(bullish|buy|strong buy|long|upgrade|breakout|moon|pump|rally|green|accumulate)\b/gi, color: '#22c55e' },
      { regex: /\b(bearish|sell|short|downgrade|breakdown|dump|crash|red|distribute|warning|risk|avoid)\b/gi, color: '#ef4444' },
      { regex: /\b(neutral|hold|mixed|sideways|consolidat\w*|uncertain|wait)\b/gi, color: '#6b7280' },
      { regex: /(@\w+)/g, color: '#5cc8f0' },
      { regex: /(\$[A-Z]{1,6})/g, color: '#a78bfa' },
      { regex: /(Sentiment Score:?\s*\d+\/10|Confidence:?\s*\d+\/10|\d+\/10)/gi, color: '#f59e0b' },
    ];

    // Simple approach: just highlight keywords inline
    let html = remaining;
    for (const { regex, color } of patterns) {
      html = html.replace(regex, (match) => `<span style="color:${color};font-weight:600">${match}</span>`);
    }

    // Bold markdown-style headers (lines starting with ## or **)
    if (/^#{1,4}\s/.test(html)) {
      html = html.replace(/^#{1,4}\s*(.*)/, '<span style="color:#e2e8f0;font-weight:700;font-size:0.85rem">$1</span>');
    }
    html = html.replace(/\*\*(.+?)\*\*/g, '<span style="color:#e2e8f0;font-weight:700">$1</span>');

    return (
      <div key={i} dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />
    );
  });
}

// ─── Structured briefing card renderer ────────────────────────────
interface BriefingSection {
  heading: string;
  bullets: string[];
}

interface BriefingResponse {
  display_type: 'briefing';
  title: string;
  summary: string;
  sections: BriefingSection[];
  sentiment_score?: number;
  confidence?: number;
  metadata?: { tokens_analyzed?: number; sources?: string[] };
}

function isBriefingResponse(obj: any): obj is BriefingResponse {
  return obj && typeof obj === 'object' && obj.display_type === 'briefing';
}

function renderBriefingCard(data: BriefingResponse) {
  const sentimentColor = (data.sentiment_score ?? 5) >= 7
    ? '#22c55e'
    : (data.sentiment_score ?? 5) >= 4
      ? '#f59e0b'
      : '#ef4444';
  const confidenceColor = (data.confidence ?? 5) >= 7
    ? '#22c55e'
    : (data.confidence ?? 5) >= 4
      ? '#f59e0b'
      : '#64748b';

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(10,15,30,0.98))',
      border: '1px solid rgba(92,200,240,0.15)',
      borderRadius: 10,
      padding: '1rem 1.2rem',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Title */}
      <div style={{
        fontSize: '0.85rem',
        fontWeight: 700,
        color: '#e2e8f0',
        marginBottom: '0.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: '0.5rem',
      }}>{data.title}</div>

      {/* Summary */}
      <div style={{
        fontSize: '0.74rem',
        color: '#94a3b8',
        lineHeight: 1.7,
        marginBottom: '0.75rem',
      }}>{data.summary}</div>

      {/* Sections */}
      {data.sections?.map((section, si) => (
        <div key={si} style={{ marginBottom: '0.6rem' }}>
          <div style={{
            fontSize: '0.76rem',
            fontWeight: 700,
            color: '#5cc8f0',
            marginBottom: '0.3rem',
          }}>{section.heading}</div>
          <ul style={{
            margin: 0,
            paddingLeft: '1.2rem',
            listStyleType: 'disc',
          }}>
            {section.bullets?.map((bullet, bi) => (
              <li key={bi} style={{
                fontSize: '0.72rem',
                color: '#94a3b8',
                lineHeight: 1.65,
                marginBottom: '0.15rem',
              }}>{bullet}</li>
            ))}
          </ul>
        </div>
      ))}

      {/* Sentiment & Confidence */}
      {(data.sentiment_score != null || data.confidence != null) && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.6rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.7rem',
        }}>
          {data.sentiment_score != null && (
            <span style={{ color: sentimentColor, fontWeight: 600 }}>
              Sentiment: {data.sentiment_score}/10
            </span>
          )}
          {data.confidence != null && (
            <span style={{ color: confidenceColor, fontWeight: 600 }}>
              Confidence: {data.confidence}/10
            </span>
          )}
        </div>
      )}

      {/* Metadata */}
      {data.metadata?.sources && data.metadata.sources.length > 0 && (
        <div style={{
          marginTop: '0.4rem',
          fontSize: '0.65rem',
          color: '#475569',
        }}>
          Sources: {data.metadata.sources.join(', ')}
        </div>
      )}
    </div>
  );
}

interface GrokMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  structured?: any;
}

// ─── Structured social response renderer ─────────────────────────
const font = "'JetBrains Mono', monospace";
const sansFont = "'Outfit', sans-serif";

function ConvictionBadge({ value }: { value: string }) {
  const color = /high/i.test(value) ? '#22c55e' : /medium/i.test(value) ? '#f59e0b' : '#64748b';
  return (
    <span style={{
      padding: '1px 7px', borderRadius: 100, fontSize: '0.6rem', fontWeight: 700,
      fontFamily: font, color, border: `1px solid ${color}40`,
      background: `${color}12`, textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    }}>{value}</span>
  );
}

function renderConsensusResponse(structured: any, fallbackText?: string) {
  const C = {
    blue: '#38bdf8', gold: '#f59e0b', green: '#22c55e', red: '#ef4444',
    purple: '#a78bfa', dim: '#475569', text: '#94a3b8', bright: '#e2e8f0',
    card: 'rgba(10,12,28,0.85)', border: 'rgba(255,255,255,0.07)',
  };

  const tickers: any[] = structured.consensus_tickers || [];
  const momentumLeaders: any[] = structured.momentum_leaders || [];
  const earlyVsCrowded = structured.early_vs_crowded || {};
  const earlyStage: any[] = earlyVsCrowded.early_stage || [];
  const crowded: any[] = earlyVsCrowded.crowded || [];
  const finalOpinion = structured.final_opinion || {};

  // If structured data has no meaningful content, fall back to text rendering
  const hasData = tickers.length > 0 || momentumLeaders.length > 0 ||
    earlyStage.length > 0 || crowded.length > 0 ||
    finalOpinion.reasoning || structured.consensus_summary;
  if (!hasData && fallbackText) {
    return renderGrokResponse(fallbackText);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: '0.6rem', marginBottom: '0.2rem' }}>
        <div style={{ color: C.bright, fontWeight: 700, fontSize: '0.85rem', fontFamily: font, marginBottom: 4 }}>
          {structured.title || 'Consensus Tickers Among Top X Traders'}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {structured.analysis_window && (
            <span style={{ color: C.dim, fontSize: '0.62rem', fontFamily: font }}>
              Window: <span style={{ color: C.blue }}>{structured.analysis_window}</span>
            </span>
          )}
          {structured.accounts_analyzed && (
            <span style={{ color: C.dim, fontSize: '0.62rem', fontFamily: font }}>
              Accounts: <span style={{ color: C.blue }}>{Array.isArray(structured.accounts_analyzed) ? structured.accounts_analyzed.length : structured.accounts_analyzed}</span>
            </span>
          )}
        </div>
      </div>

      {/* Consensus summary */}
      {structured.consensus_summary && (
        <div style={{ color: C.text, fontSize: '0.74rem', fontFamily: sansFont, lineHeight: 1.65,
          background: `${C.blue}08`, border: `1px solid ${C.blue}18`, borderRadius: 8, padding: '0.65rem 0.9rem' }}>
          {structured.consensus_summary}
        </div>
      )}

      {/* Consensus tickers */}
      {tickers.length > 0 && (
        <div>
          <div style={{ color: C.dim, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Consensus Tickers ({tickers.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tickers.map((t: any, i: number) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.75rem 0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: t.thesis || t.why_bullish ? 6 : 0 }}>
                  {t.rank != null && <span style={{ color: C.gold, fontWeight: 800, fontSize: '0.8rem', fontFamily: font }}>#{t.rank}</span>}
                  <span style={{ color: C.blue, fontWeight: 800, fontSize: '0.88rem', fontFamily: font }}>{t.ticker}</span>
                  {t.conviction && <ConvictionBadge value={t.conviction} />}
                  {t.consensus_strength && (
                    <span style={{ color: C.purple, fontSize: '0.62rem', fontFamily: font }}>{t.consensus_strength}</span>
                  )}
                  {t.trader_count != null && (
                    <span style={{ color: C.dim, fontSize: '0.62rem', fontFamily: font }}>{t.trader_count} traders</span>
                  )}
                  {t.signal_weight != null && (
                    <span style={{ color: C.gold, fontSize: '0.62rem', fontFamily: font }}>score {t.signal_weight}</span>
                  )}
                  {t.momentum && (
                    <span style={{ color: /increas/i.test(t.momentum) ? C.green : C.dim, fontSize: '0.62rem', fontFamily: font }}>↑ {t.momentum}</span>
                  )}
                </div>
                {t.thesis && <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.6, marginBottom: 4 }}>{t.thesis}</div>}
                {t.why_bullish && <div style={{ color: C.green, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.5, marginBottom: 4 }}>Bullish: {t.why_bullish}</div>}
                {t.risks && <div style={{ color: C.red, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.5, marginBottom: 4 }}>Risks: {t.risks}</div>}
                {Array.isArray(t.representative_reasons) && t.representative_reasons.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {t.representative_reasons.map((r: string, j: number) => (
                      <div key={j} style={{ color: C.dim, fontSize: '0.65rem', fontFamily: sansFont, lineHeight: 1.5 }}>• {r}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Momentum leaders */}
      {momentumLeaders.length > 0 && (
        <div>
          <div style={{ color: C.dim, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
            Momentum Leaders
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {momentumLeaders.map((m: any, i: number) => (
              <div key={i} style={{ padding: '0.35rem 0.75rem', background: `${C.green}10`,
                border: `1px solid ${C.green}28`, borderRadius: 8 }}>
                <span style={{ color: C.green, fontWeight: 700, fontFamily: font, fontSize: '0.72rem' }}>{m.ticker}</span>
                {m.note && <span style={{ color: C.dim, fontSize: '0.62rem', fontFamily: sansFont, marginLeft: 6 }}>{m.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Early vs Crowded */}
      {(earlyStage.length > 0 || crowded.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <div style={{ color: C.dim, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              Early Stage
            </div>
            {earlyStage.length > 0 ? earlyStage.map((e: any, i: number) => (
              <div key={i} style={{ padding: '0.35rem 0.65rem', background: `${C.purple}10`,
                border: `1px solid ${C.purple}28`, borderRadius: 6, marginBottom: 4 }}>
                <span style={{ color: C.purple, fontWeight: 700, fontFamily: font, fontSize: '0.72rem' }}>{e.ticker}</span>
                {e.note && <div style={{ color: C.dim, fontSize: '0.62rem', fontFamily: sansFont }}>{e.note}</div>}
              </div>
            )) : <div style={{ color: C.dim, fontSize: '0.65rem', fontFamily: sansFont }}>—</div>}
          </div>
          <div>
            <div style={{ color: C.dim, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              Crowded
            </div>
            {crowded.length > 0 ? crowded.map((c: any, i: number) => (
              <div key={i} style={{ padding: '0.35rem 0.65rem', background: `${C.gold}08`,
                border: `1px solid ${C.gold}28`, borderRadius: 6, marginBottom: 4 }}>
                <span style={{ color: C.gold, fontWeight: 700, fontFamily: font, fontSize: '0.72rem' }}>{c.ticker}</span>
                {c.note && <div style={{ color: C.dim, fontSize: '0.62rem', fontFamily: sansFont }}>{c.note}</div>}
              </div>
            )) : <div style={{ color: C.dim, fontSize: '0.65rem', fontFamily: sansFont }}>—</div>}
          </div>
        </div>
      )}

      {/* Final opinion */}
      {(finalOpinion.reasoning || (finalOpinion.strongest_buys && finalOpinion.strongest_buys.length > 0)) && (
        <div style={{ background: `${C.gold}08`, border: `1px solid ${C.gold}22`, borderRadius: 8, padding: '0.75rem 0.9rem' }}>
          <div style={{ color: C.gold, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Final Opinion
          </div>
          {finalOpinion.strongest_buys && finalOpinion.strongest_buys.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: C.dim, fontSize: '0.65rem', fontFamily: font }}>Strongest Buys: </span>
              {finalOpinion.strongest_buys.map((t: string, i: number) => (
                <span key={i} style={{ color: C.green, fontWeight: 700, fontFamily: font, fontSize: '0.72rem', marginRight: 6 }}>{t}</span>
              ))}
            </div>
          )}
          {finalOpinion.watch_closely && finalOpinion.watch_closely.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: C.dim, fontSize: '0.65rem', fontFamily: font }}>Watch Closely: </span>
              {finalOpinion.watch_closely.map((t: string, i: number) => (
                <span key={i} style={{ color: C.blue, fontWeight: 700, fontFamily: font, fontSize: '0.72rem', marginRight: 6 }}>{t}</span>
              ))}
            </div>
          )}
          {finalOpinion.reasoning && (
            <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.65 }}>{finalOpinion.reasoning}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Consensus Briefing renderer (market_pulse / hype_radar / consensus_picks / spotlight / fresh_trades) ───
function isConsensusBriefing(obj: any): boolean {
  return obj && typeof obj === 'object' &&
    (obj.display_type === 'briefing' || obj.scan_type === 'x_select_trader_consensus' || obj.scan_type === 'x_trader_consensus') &&
    (obj.market_pulse || obj.hype_radar || obj.consensus_picks || obj.fresh_trades);
}

// ─── TradingView chart dropdown ───────────────────────────────────
function TradingViewChart({ symbol }: { symbol: string }) {
  const src = `https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(symbol)}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=0b1217&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=0&width=100%25&height=100%25`;
  return (
    <div style={{ width: '100%', height: 400, marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
      <iframe
        src={src}
        width="100%"
        height="100%"
        frameBorder="0"
        allowTransparency={true}
        style={{ display: 'block' }}
      />
    </div>
  );
}

function ConsensusBriefingCard({ data }: { data: any }) {
  const [expandedPick, setExpandedPick] = useState<string | null>(null);
  const [expandedHypeTicker, setExpandedHypeTicker] = useState<string | null>(null);

  const C = {
    blue: '#38bdf8', gold: '#f59e0b', green: '#22c55e', red: '#ef4444',
    purple: '#a78bfa', dim: '#475569', text: '#94a3b8', bright: '#e2e8f0',
    card: 'rgba(10,12,28,0.85)', border: 'rgba(255,255,255,0.07)',
  };
  const mp = data.market_pulse || {};
  const hypeRadar: any[] = data.hype_radar || [];
  const picks: any[] = data.consensus_picks || [];
  const spotlight = data.spotlight || null;
  const freshTrades: any[] = data.fresh_trades || [];
  const bias = data.portfolio_bias || '';

  const verdictColor = /bull/i.test(mp.verdict || '') ? C.green : /bear/i.test(mp.verdict || '') ? C.red : C.gold;

  const buzzColor = (level: string) => {
    if (/extreme/i.test(level)) return C.red;
    if (/high/i.test(level)) return C.gold;
    if (/moderate/i.test(level)) return '#eab308';
    return C.dim;
  };

  const handlePickClick = (ticker: string) => {
    setExpandedPick(expandedPick === ticker ? null : ticker);
  };

  const handleHypeTickerClick = (theme: string, ticker: string) => {
    const key = `${theme}-${ticker}`;
    setExpandedHypeTicker(expandedHypeTicker === key ? null : key);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* Market Pulse */}
      {(mp.verdict || mp.summary) && (
        <div style={{ background: `${verdictColor}08`, border: `1px solid ${verdictColor}22`, borderRadius: 8, padding: '0.75rem 0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 6 }}>
            <span style={{ color: C.dim, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>Market Pulse</span>
            {mp.verdict && (
              <span style={{ color: verdictColor, fontWeight: 800, fontSize: '0.72rem', fontFamily: font,
                textTransform: 'uppercase' }}>{mp.verdict}</span>
            )}
            {mp.regime && (
              <span style={{ color: C.dim, fontSize: '0.62rem', fontFamily: font }}>({mp.regime})</span>
            )}
          </div>
          {mp.summary && (
            <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.65 }}>{mp.summary}</div>
          )}
        </div>
      )}

      {/* Hype Radar */}
      {hypeRadar.length > 0 && (
        <div>
          <div style={{ color: C.dim, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Hype Radar ({hypeRadar.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {hypeRadar.map((h: any, i: number) => {
              const themeKey = h.theme || `hype-${i}`;
              const bc = buzzColor(h.buzz_level || '');
              return (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.7rem 0.85rem' }}>
                  {/* Theme title + buzz badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ color: C.bright, fontWeight: 700, fontSize: '0.78rem', fontFamily: font }}>{h.theme || 'Untitled Theme'}</span>
                    {h.buzz_level && (
                      <span style={{
                        padding: '1px 7px', borderRadius: 100, fontSize: '0.58rem', fontWeight: 700,
                        fontFamily: font, color: bc, border: `1px solid ${bc}40`,
                        background: `${bc}12`, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>{h.buzz_level}</span>
                    )}
                  </div>

                  {/* Why hot */}
                  {h.why_hot && (
                    <div style={{ color: C.text, fontSize: '0.7rem', fontFamily: sansFont, lineHeight: 1.6, marginBottom: 8 }}>{h.why_hot}</div>
                  )}

                  {/* Key tickers as clickable chips */}
                  {Array.isArray(h.key_tickers) && h.key_tickers.length > 0 && (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {h.key_tickers.map((ticker: string, j: number) => {
                          const chipKey = `${themeKey}-${ticker}`;
                          const isExpanded = expandedHypeTicker === chipKey;
                          return (
                            <button
                              key={j}
                              onClick={() => handleHypeTickerClick(themeKey, ticker)}
                              style={{
                                padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                                fontFamily: font, color: isExpanded ? '#fff' : C.blue,
                                background: isExpanded ? `${C.blue}30` : `${C.blue}10`,
                                border: `1px solid ${isExpanded ? C.blue : `${C.blue}30`}`,
                                cursor: 'pointer', transition: 'all 0.15s',
                              }}
                              onMouseOver={e => { (e.currentTarget).style.background = `${C.blue}20`; }}
                              onMouseOut={e => { (e.currentTarget).style.background = isExpanded ? `${C.blue}30` : `${C.blue}10`; }}
                            >${ticker}</button>
                          );
                        })}
                      </div>
                      {/* Full-width chart outside the flex row */}
                      {h.key_tickers.map((ticker: string) => {
                        const chipKey = `${themeKey}-${ticker}`;
                        return expandedHypeTicker === chipKey
                          ? <TradingViewChart key={ticker} symbol={`NASDAQ:${ticker}`} />
                          : null;
                      })}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consensus Picks */}
      {picks.length > 0 && (
        <div>
          <div style={{ color: C.dim, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Consensus Picks ({picks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {picks.map((p: any, i: number) => {
              const pickTicker = p.ticker || p.symbol || `pick-${i}`;
              const isExpanded = expandedPick === pickTicker;
              const tvSymbol = p.tradingview_symbol || `NASDAQ:${pickTicker}`;
              return (
                <div key={i}>
                  <div
                    onClick={() => handlePickClick(pickTicker)}
                    style={{
                      background: isExpanded ? `${C.card}` : C.card,
                      border: `1px solid ${isExpanded ? C.blue + '40' : C.border}`,
                      borderRadius: 8, padding: '0.75rem 0.9rem',
                      cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                    onMouseOver={e => { (e.currentTarget).style.borderColor = `${C.blue}30`; }}
                    onMouseOut={e => { (e.currentTarget).style.borderColor = isExpanded ? `${C.blue}40` : 'rgba(255,255,255,0.07)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: p.thesis || p.reason ? 6 : 0 }}>
                      {p.rank != null && <span style={{ color: C.gold, fontWeight: 800, fontSize: '0.8rem', fontFamily: font }}>#{p.rank}</span>}
                      <span style={{ color: C.blue, fontWeight: 800, fontSize: '0.88rem', fontFamily: font }}>{pickTicker}</span>
                      {p.conviction && <ConvictionBadge value={p.conviction} />}
                      {p.trader_count != null && (
                        <span style={{ color: C.dim, fontSize: '0.62rem', fontFamily: font }}>{p.trader_count} traders</span>
                      )}
                      {p.direction && (
                        <span style={{ color: /bull|long|buy/i.test(p.direction) ? C.green : /bear|short|sell/i.test(p.direction) ? C.red : C.gold,
                          fontSize: '0.62rem', fontWeight: 700, fontFamily: font, textTransform: 'uppercase' }}>{p.direction}</span>
                      )}
                      <span style={{ color: C.dim, fontSize: '0.58rem', fontFamily: font, marginLeft: 'auto' }}>
                        {isExpanded ? '▼ chart' : '▶ chart'}
                      </span>
                    </div>
                    {p.thesis && <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.6 }}>{p.thesis}</div>}
                    {p.reason && <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.6 }}>{p.reason}</div>}
                    {p.why_bullish && <div style={{ color: C.green, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.5, marginTop: 4 }}>Bullish: {p.why_bullish}</div>}
                    {p.risks && <div style={{ color: C.red, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.5, marginTop: 4 }}>Risks: {p.risks}</div>}
                    {Array.isArray(p.traders) && p.traders.length > 0 && (
                      <div style={{ color: C.dim, fontSize: '0.62rem', fontFamily: font, marginTop: 4 }}>
                        Traders: {p.traders.join(', ')}
                      </div>
                    )}
                  </div>
                  {isExpanded && <TradingViewChart symbol={tvSymbol} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spotlight */}
      {spotlight && (spotlight.ticker || spotlight.symbol) && (
        <div style={{ background: `${C.purple}08`, border: `1px solid ${C.purple}22`, borderRadius: 8, padding: '0.75rem 0.9rem' }}>
          <div style={{ color: C.purple, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Spotlight
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: spotlight.thesis || spotlight.reason ? 6 : 0 }}>
            <span style={{ color: C.purple, fontWeight: 800, fontSize: '0.88rem', fontFamily: font }}>{spotlight.ticker || spotlight.symbol}</span>
            {spotlight.conviction && <ConvictionBadge value={spotlight.conviction} />}
          </div>
          {spotlight.thesis && <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.65 }}>{spotlight.thesis}</div>}
          {spotlight.reason && <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.65 }}>{spotlight.reason}</div>}
          {spotlight.catalyst && <div style={{ color: C.gold, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.5, marginTop: 4 }}>{spotlight.catalyst}</div>}
        </div>
      )}

      {/* Fresh Trades */}
      {freshTrades.length > 0 && (
        <div>
          <div style={{ color: C.dim, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
            Fresh Trades
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {freshTrades.map((t: any, i: number) => (
              <div key={i} style={{ padding: '0.35rem 0.75rem', background: `${C.green}10`,
                border: `1px solid ${C.green}28`, borderRadius: 8 }}>
                <span style={{ color: C.green, fontWeight: 700, fontFamily: font, fontSize: '0.72rem' }}>{t.ticker || t.symbol}</span>
                {t.action && <span style={{ color: C.dim, fontSize: '0.62rem', fontFamily: sansFont, marginLeft: 6 }}>{t.action}</span>}
                {t.trader && <span style={{ color: C.blue, fontSize: '0.62rem', fontFamily: font, marginLeft: 6 }}>@{t.trader}</span>}
                {t.note && <span style={{ color: C.dim, fontSize: '0.62rem', fontFamily: sansFont, marginLeft: 6 }}>{t.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Bias */}
      {bias && (
        <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.65,
          background: `${C.blue}08`, border: `1px solid ${C.blue}18`, borderRadius: 8, padding: '0.65rem 0.9rem' }}>
          <span style={{ color: C.dim, fontSize: '0.6rem', fontWeight: 700, fontFamily: font,
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>Portfolio Bias: </span>
          {bias}
        </div>
      )}
    </div>
  );
}

// ─── X Snapshot — 4 primary sections ─────────────────────────────
function XSnapshotSections({ tx }: { tx: any }) {
  const [expandedTicker,      setExpandedTicker]      = useState<string | null>(null);
  const [expandedThemeTicker, setExpandedThemeTicker] = useState<string | null>(null);
  const [expandedAccelTicker, setExpandedAccelTicker] = useState<string | null>(null);
  const [expandedAlphaTicker, setExpandedAlphaTicker] = useState<string | null>(null);

  const C = {
    blue: '#38bdf8', gold: '#f59e0b', green: '#22c55e', red: '#ef4444',
    purple: '#a78bfa', dim: '#475569', text: '#94a3b8', bright: '#e2e8f0',
    card: 'rgba(10,12,28,0.85)', border: 'rgba(255,255,255,0.07)',
  };

  const mp          = tx.market_pulse      || {};
  const bias        = tx.portfolio_bias    || '';
  const topTickers: any[] = tx.top_tickers        || [];
  const keyThemes:  any[] = tx.key_themes          || [];
  const sentAccel:  any[] = tx.sentiment_acceleration || [];
  const freshAlpha         = tx.freshest_alpha || tx.spotlight || null;
  const freshTrades: any[] = tx.fresh_trades   || [];
  const isStale      = tx.is_stale === true || tx.stale === true;
  const isRefreshing = tx.refresh_in_progress === true;
  const generatedAt  = tx.generated_at ? new Date(tx.generated_at) : null;
  const verdictColor = /bull/i.test(mp.verdict || '') ? C.green : /bear/i.test(mp.verdict || '') ? C.red : C.gold;

  const relTime = (() => {
    if (!generatedAt) return null;
    const ageMs  = Date.now() - generatedAt.getTime();
    const ageSec = Math.max(0, Math.floor(ageMs / 1000));
    if (ageSec < 60)  return `${ageSec}s ago`;
    const ageMin = Math.floor(ageSec / 60);
    if (ageMin < 60)  return `${ageMin}m ago`;
    const ageHr  = Math.floor(ageMin / 60);
    if (ageHr  < 24)  return `${ageHr}h ago`;
    return `${Math.floor(ageHr / 24)}d ago`;
  })();

  const toggle = (key: string, setter: (v: string | null) => void, current: string | null) =>
    setter(current === key ? null : key);

  const sentColor = (s: string | null | undefined) =>
    !s ? C.dim : /bull/i.test(s) ? C.green : /bear/i.test(s) ? C.red : C.gold;

  const buzzColor = (lvl: string) =>
    /extreme/i.test(lvl) ? C.red : /high/i.test(lvl) ? C.gold : /moderate/i.test(lvl) ? '#eab308' : C.dim;

  const cardStyle: CSSProperties = {
    background: '#0a0b1e',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: '1.25rem 1.25rem 1rem',
    display: 'flex',
    flexDirection: 'column',
  };

  const sectionTitle = (label: string, color: string, count?: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
      <span style={{ fontFamily: font, fontSize: '0.75rem', fontWeight: 700, color }}>{label}</span>
      {count != null && count > 0 && (
        <span style={{ color: C.dim, fontSize: '0.6rem', fontFamily: font }}>({count})</span>
      )}
    </div>
  );

  const emptyState = (msg: string) => (
    <div style={{ color: C.dim, fontSize: '0.72rem', fontFamily: sansFont, padding: '0.75rem 0', textAlign: 'center' }}>
      {msg}
    </div>
  );

  const tickerChip = (ticker: string, isExp: boolean, onClick: () => void, chipColor: string) => (
    <button
      key={ticker}
      onClick={onClick}
      style={{
        padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
        fontFamily: font, color: isExp ? '#fff' : chipColor,
        background: isExp ? `${chipColor}30` : `${chipColor}10`,
        border: `1px solid ${isExp ? chipColor : `${chipColor}30`}`,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >${ticker}</button>
  );

  return (
    <section style={{ maxWidth: 1400, margin: '0 auto', padding: '0 1.5rem 0', position: 'relative', zIndex: 1 }}>
      <style>{`
        .x-snap-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.9rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 1000px) {
          .x-snap-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .x-snap-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Context strip (Market Pulse + Portfolio Bias) ── */}
      {(mp.verdict || mp.summary || bias) && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          {(mp.verdict || mp.summary) && (
            <div style={{ flex: 1, minWidth: 200, background: `${verdictColor}08`, border: `1px solid ${verdictColor}22`,
              borderRadius: 8, padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ color: C.dim, fontSize: '0.58rem', fontWeight: 700, fontFamily: font,
                textTransform: 'uppercase', letterSpacing: '0.08em' }}>Market Pulse</span>
              {mp.verdict && <span style={{ color: verdictColor, fontWeight: 800, fontSize: '0.7rem', fontFamily: font, textTransform: 'uppercase' }}>{mp.verdict}</span>}
              {mp.summary && <span style={{ color: C.text, fontSize: '0.68rem', fontFamily: sansFont }}>{mp.summary}</span>}
            </div>
          )}
          {bias && (
            <div style={{ flex: 1, minWidth: 200, background: `${C.blue}08`, border: `1px solid ${C.blue}18`,
              borderRadius: 8, padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ color: C.dim, fontSize: '0.58rem', fontWeight: 700, fontFamily: font,
                textTransform: 'uppercase', letterSpacing: '0.08em' }}>Portfolio Bias</span>
              <span style={{ color: C.text, fontSize: '0.68rem', fontFamily: sansFont }}>{bias}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Freshness + state strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        {relTime && <span style={{ color: C.dim, fontSize: '0.6rem', fontFamily: font }}>Updated {relTime}</span>}
        {isStale && (
          <span style={{ color: '#f59e0b', fontSize: '0.58rem', fontFamily: font, fontWeight: 700,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>STALE</span>
        )}
        {isRefreshing && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.dim, fontSize: '0.6rem', fontFamily: font }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', opacity: 0.8 }} />
            Refreshing…
          </span>
        )}
      </div>

      {/* ── 4-col → 2-col grid ── */}
      <div className="x-snap-grid">

        {/* ① X Consensus */}
        <div style={cardStyle}>
          {sectionTitle('𝕏 Consensus', C.blue, topTickers.length)}
          {topTickers.length === 0 ? emptyState('No consensus data yet.') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, overflowY: 'auto', maxHeight: 480 }}>
              {topTickers.map((t: any, i: number) => {
                const sym   = t.symbol || t.ticker;
                const isExp = expandedTicker === sym;
                return (
                  <div key={sym || i}>
                    <div
                      onClick={() => toggle(sym, setExpandedTicker, expandedTicker)}
                      style={{
                        background: isExp ? `${C.blue}0a` : C.card,
                        border: `1px solid ${isExp ? `${C.blue}40` : C.border}`,
                        borderRadius: 8, padding: '0.6rem 0.8rem',
                        cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: t.rationale ? 5 : 0, flexWrap: 'wrap' }}>
                        <span style={{ color: C.dim, fontWeight: 700, fontSize: '0.7rem', fontFamily: font }}>#{i + 1}</span>
                        <span style={{ color: C.blue, fontWeight: 800, fontSize: '0.88rem', fontFamily: font }}>${sym}</span>
                        {t.sentiment && (
                          <span style={{ color: sentColor(t.sentiment), fontSize: '0.6rem', fontFamily: font, fontWeight: 700, textTransform: 'uppercase' }}>{t.sentiment}</span>
                        )}
                        {Array.isArray(t.accounts) && t.accounts.length > 0 && (
                          <span style={{ color: C.dim, fontSize: '0.58rem', fontFamily: font }}>{t.accounts.length} src</span>
                        )}
                        <span style={{ color: C.dim, fontSize: '0.56rem', fontFamily: font, marginLeft: 'auto' }}>{isExp ? '▼' : '▶'} chart</span>
                      </div>
                      {t.rationale && (
                        <div style={{
                          color: C.text, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.55,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: isExp ? 'unset' : 2,
                          WebkitBoxOrient: 'vertical' as const,
                        }}>
                          {t.rationale}
                        </div>
                      )}
                    </div>
                    {isExp && <TradingViewChart symbol={`NASDAQ:${sym}`} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ② Freshest Alpha */}
        <div style={cardStyle}>
          {sectionTitle('Freshest Alpha', C.green)}
          {!freshAlpha && freshTrades.length === 0 ? emptyState('No fresh alpha data yet.') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {freshAlpha && (freshAlpha.ticker || freshAlpha.symbol) && (() => {
                const sym   = freshAlpha.ticker || freshAlpha.symbol;
                const isExp = expandedAlphaTicker === sym;
                return (
                  <div>
                    <div
                      onClick={() => toggle(sym, setExpandedAlphaTicker, expandedAlphaTicker)}
                      style={{ background: `${C.purple}08`, border: `1px solid ${C.purple}22`, borderRadius: 8, padding: '0.75rem 0.9rem', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ padding: '1px 7px', borderRadius: 100, fontSize: '0.58rem', fontWeight: 700,
                          fontFamily: font, color: C.purple, border: `1px solid ${C.purple}40`,
                          background: `${C.purple}12`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>SPOTLIGHT</span>
                        <span style={{ color: C.purple, fontWeight: 800, fontSize: '0.88rem', fontFamily: font }}>${sym}</span>
                        {freshAlpha.conviction && <ConvictionBadge value={freshAlpha.conviction} />}
                        <span style={{ color: C.dim, fontSize: '0.56rem', fontFamily: font, marginLeft: 'auto' }}>{isExp ? '▼' : '▶'} chart</span>
                      </div>
                      {freshAlpha.thesis && <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.65 }}>{freshAlpha.thesis}</div>}
                      {freshAlpha.reason && <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.65 }}>{freshAlpha.reason}</div>}
                      {freshAlpha.catalyst && <div style={{ color: C.gold, fontSize: '0.68rem', fontFamily: sansFont, marginTop: 4 }}>{freshAlpha.catalyst}</div>}
                      {freshAlpha.first_mentioned_by && <div style={{ color: C.blue, fontSize: '0.62rem', fontFamily: font, marginTop: 4 }}>First by: {freshAlpha.first_mentioned_by}</div>}
                    </div>
                    {isExp && <TradingViewChart symbol={`NASDAQ:${sym}`} />}
                  </div>
                );
              })()}
              {freshTrades.length > 0 && (
                <div>
                  <div style={{ color: C.dim, fontSize: '0.58rem', fontWeight: 700, fontFamily: font,
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Fresh Trades</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {freshTrades.map((t: any, i: number) => {
                      const sym   = t.ticker || t.symbol;
                      const key   = `ft-${sym}`;
                      const isExp = expandedAlphaTicker === key;
                      return (
                        <div key={i}>
                          {tickerChip(sym, isExp, () => toggle(key, setExpandedAlphaTicker, expandedAlphaTicker), C.green)}
                          {isExp && <TradingViewChart symbol={`NASDAQ:${sym}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ③ Theme Leadership */}
        <div style={cardStyle}>
          {sectionTitle('Theme Leadership', C.gold, keyThemes.length)}
          {keyThemes.length === 0 ? emptyState('No theme data yet.') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', maxHeight: 480 }}>
              {keyThemes.map((h: any, i: number) => {
                const themeKey = h.theme || h.name || `theme-${i}`;
                const buzzLvl  = h.buzz_level || h.buzz || '';
                const bc       = buzzColor(buzzLvl);
                return (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.7rem 0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ color: C.bright, fontWeight: 700, fontSize: '0.78rem', fontFamily: font }}>{themeKey}</span>
                      {buzzLvl && (
                        <span style={{ padding: '1px 7px', borderRadius: 100, fontSize: '0.58rem', fontWeight: 700,
                          fontFamily: font, color: bc, border: `1px solid ${bc}40`,
                          background: `${bc}12`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{buzzLvl}</span>
                      )}
                    </div>
                    {(h.why_hot || h.description) && (
                      <div style={{ color: C.text, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.55, marginBottom: 8 }}>
                        {h.why_hot || h.description}
                      </div>
                    )}
                    {Array.isArray(h.key_tickers) && h.key_tickers.length > 0 && (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {h.key_tickers.map((ticker: string, j: number) => {
                            const chipKey = `${themeKey}-${ticker}`;
                            const isExp   = expandedThemeTicker === chipKey;
                            return tickerChip(ticker, isExp, () => toggle(chipKey, setExpandedThemeTicker, expandedThemeTicker), C.blue);
                          })}
                        </div>
                        {h.key_tickers.map((ticker: string) => {
                          const chipKey = `${themeKey}-${ticker}`;
                          return expandedThemeTicker === chipKey
                            ? <TradingViewChart key={ticker} symbol={`NASDAQ:${ticker}`} />
                            : null;
                        })}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ④ Sentiment Acceleration */}
        <div style={cardStyle}>
          {sectionTitle('Sentiment Acceleration', C.purple, sentAccel.length)}
          {sentAccel.length === 0 ? emptyState('No acceleration data yet.') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, overflowY: 'auto', maxHeight: 480 }}>
              {sentAccel.map((item: any, i: number) => {
                const sym   = item.ticker || item.symbol;
                const isExp = expandedAccelTicker === sym;
                return (
                  <div key={sym || i}>
                    <div
                      onClick={() => toggle(sym, setExpandedAccelTicker, expandedAccelTicker)}
                      style={{
                        background: C.card, border: `1px solid ${isExp ? `${C.purple}40` : C.border}`,
                        borderRadius: 8, padding: '0.65rem 0.85rem', cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                        marginBottom: (item.reason || item.why_now || item.context) ? 5 : 0 }}>
                        <span style={{ color: C.purple, fontWeight: 800, fontSize: '0.88rem', fontFamily: font }}>${sym}</span>
                        {item.hype_delta != null && (
                          <span style={{ color: item.hype_delta >= 0 ? C.green : C.red, fontSize: '0.62rem', fontFamily: font, fontWeight: 700 }}>
                            Δ{item.hype_delta >= 0 ? '+' : ''}{item.hype_delta}
                          </span>
                        )}
                        {item.mention_delta != null && (
                          <span style={{ color: item.mention_delta >= 0 ? C.green : C.red, fontSize: '0.62rem', fontFamily: font }}>
                            mentions {item.mention_delta >= 0 ? '+' : ''}{item.mention_delta}
                          </span>
                        )}
                        {item.sentiment && (
                          <span style={{ color: sentColor(item.sentiment), fontSize: '0.6rem', fontFamily: font, fontWeight: 700, textTransform: 'uppercase' }}>{item.sentiment}</span>
                        )}
                        <span style={{ color: C.dim, fontSize: '0.56rem', fontFamily: font, marginLeft: 'auto' }}>{isExp ? '▼' : '▶'} chart</span>
                      </div>
                      {(item.reason || item.why_now || item.context) && (
                        <div style={{ color: C.text, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.55 }}>
                          {item.reason || item.why_now || item.context}
                        </div>
                      )}
                    </div>
                    {isExp && <TradingViewChart symbol={`NASDAQ:${sym}`} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

function GrokSocialAgent() {
  const [messages, setMessages] = useState<GrokMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string, presetIntent?: string) => {
    const effectiveText = text.trim() || (presetIntent ? presetIntent.replace(/_/g, ' ') : '');
    if (!effectiveText && !presetIntent) return;
    if (loading) return;
    const userMsg: GrokMessage = { role: 'user', content: text.trim() || presetIntent || '', timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const payload: Record<string, any> = { query: text.trim() };
      if (presetIntent) payload.preset_intent = presetIntent;

      console.log('[SOCIAL_QUERY] Sending:', JSON.stringify(payload));
      const res = await fetch(`${AGENT_BACKEND_URL}/api/social/query`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[SOCIAL_QUERY] HTTP error:', res.status, errText.slice(0, 500));
        throw new Error(`${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      console.log('[SOCIAL_QUERY] Response:', JSON.stringify(data).slice(0, 1000));

      // Backend returns { response: <object|string>, structured: true, preset: '...' }
      // When response is an object (briefing JSON), use it as structured data
      let responseText: string;
      let structuredData: any = null;

      if (data.response && typeof data.response === 'object') {
        // Nested: data.response IS the structured briefing
        structuredData = data.response;
        responseText = data.response.summary || data.response.consensus_summary || JSON.stringify(data.response);
        console.log('[SOCIAL_QUERY] Structured briefing detected:', structuredData.display_type, structuredData.scan_type);
      } else {
        responseText = data.response || data.analysis || data.error || 'No response received';
        structuredData = (data.structured && typeof data.structured === 'object') ? data.structured : null;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
        structured: structuredData,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to reach Grok. Please try again.'}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <section style={{ maxWidth: 1400, margin: '0 auto', padding: '0 1.5rem 2rem', position: 'relative', zIndex: 1 }}>
      <div style={{
        background: '#0a0b1e',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #2090d0 0%, #3b82f6 50%, #80d8f8 100%)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', fontWeight: 700, color: '#fff',
          }}>𝕏</div>
          <div>
            <h3 style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0',
              letterSpacing: '-0.01em', margin: 0,
            }}>Ask Caelyn</h3>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.62rem', color: '#475569',
              margin: 0, letterSpacing: '0.02em',
            }}>Real-time X/Twitter sentiment via xAI Grok</p>
          </div>
        </div>

        {/* Input bar */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Grok about X/Twitter sentiment..."
            disabled={loading}
            style={{
              flex: 1,
              background: 'rgba(10,12,18,0.85)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: '0.65rem 0.9rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.78rem',
              color: '#e2e8f0',
              outline: 'none',
              transition: 'border-color 0.2s',
              opacity: loading ? 0.5 : 1,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              background: 'linear-gradient(135deg, #2090d0 0%, #3b82f6 100%)',
              border: 'none',
              borderRadius: 8,
              padding: '0.65rem 1rem',
              color: '#fff',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.35 : 1,
              transition: 'opacity 0.2s',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
          >{loading ? '...' : 'SEND'}</button>
        </form>

        {/* ── Social preset button — shown above messages only when no messages yet ── */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem' }}>
            <button
              onClick={() => sendMessage('Concensus tickers among select X traders', 'x_select_trader_consensus')}
              disabled={loading}
              style={{
                width: '100%',
                fontFamily: font,
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: 8,
                padding: '0.45rem 1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.4 : 1,
                transition: 'all 0.2s',
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
              onMouseOver={e => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.15)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.5)';
                }
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.08)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.3)';
              }}
            >
              <span style={{ fontSize: '0.7rem' }}>𝕏</span>
              Concensus tickers among select X traders
            </button>
          </div>
        )}

        {/* Pre-prompt chips — shown above messages only when no messages yet */}
        {messages.length === 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.4rem',
            marginBottom: '0.5rem',
          }}>
            {SUGGESTED_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  color: '#64748b',
                  background: 'rgba(32,144,208,0.06)',
                  border: '1px solid rgba(32,144,208,0.2)',
                  borderRadius: 100,
                  padding: '0.35rem 0.75rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.4 : 1,
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={e => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(32,144,208,0.15)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(32,144,208,0.4)';
                  }
                }}
                onMouseOut={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(32,144,208,0.06)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(32,144,208,0.2)';
                }}
              >{prompt}</button>
            ))}
          </div>
        )}

        {/* Messages / Response area */}
        {(messages.length > 0 || loading) && (
          <div ref={messagesContainerRef} style={{
            maxHeight: 600,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            marginBottom: '1rem',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                background: msg.role === 'user' ? 'rgba(32,144,208,0.08)' : '#0d0e22',
                border: `1px solid ${msg.role === 'user' ? 'rgba(32,144,208,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8,
                padding: '0.75rem 1rem',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                  color: msg.role === 'user' ? '#80d8f8' : '#5cc8f0',
                  marginBottom: '0.4rem',
                }}>{msg.role === 'user' ? 'YOU' : 'GROK'}</div>
                <div style={{
                  fontFamily: msg.role === 'assistant' ? "'JetBrains Mono', monospace" : "'Outfit', sans-serif",
                  fontSize: msg.role === 'assistant' ? '0.74rem' : '0.8rem',
                  lineHeight: 1.65,
                  color: msg.role === 'user' ? '#c7d2fe' : '#94a3b8',
                }}>
                  {msg.role === 'assistant'
                    ? isConsensusBriefing(msg.structured)
                      ? <ConsensusBriefingCard data={msg.structured} />
                      : (msg.structured?.scan_type === 'x_trader_consensus' || msg.structured?.display_type === 'social')
                        ? renderConsensusResponse(msg.structured, typeof msg.content === 'string' ? msg.content : undefined)
                        : isBriefingResponse(msg.content) || isBriefingResponse(msg.structured)
                          ? renderBriefingCard((isBriefingResponse(msg.content) ? msg.content : msg.structured) as BriefingResponse)
                          : renderGrokResponse(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2))
                    : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{
                background: '#0d0e22',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '0.75rem 1rem',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.74rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: 12, height: 12,
                    border: '2px solid #3b82f6',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Scanning X...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* After-response prompts — shown below messages once there are messages */}
        {messages.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => sendMessage('Concensus tickers among select X traders', 'x_select_trader_consensus')}
              disabled={loading}
              style={{
                width: '100%',
                fontFamily: font,
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: 8,
                padding: '0.45rem 1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.4 : 1,
                transition: 'all 0.2s',
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
              onMouseOver={e => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.15)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.5)';
                }
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.08)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.3)';
              }}
            >
              <span style={{ fontSize: '0.7rem' }}>𝕏</span>
              Concensus tickers among select X traders
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.65rem',
                    color: '#64748b',
                    background: 'rgba(32,144,208,0.06)',
                    border: '1px solid rgba(32,144,208,0.2)',
                    borderRadius: 100,
                    padding: '0.35rem 0.75rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.4 : 1,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={e => {
                    if (!loading) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(32,144,208,0.15)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(32,144,208,0.4)';
                    }
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(32,144,208,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(32,144,208,0.2)';
                  }}
                >{prompt}</button>
              ))}
            </div>

            <button
              onClick={() => setMessages([])}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6rem',
                color: '#334155',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'color 0.2s',
                alignSelf: 'flex-start',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.color = '#334155'; }}
            >Clear conversation</button>
          </div>
        )}
      </div>

      {/* CSS animation for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

interface SafeLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const SafeLink: React.FC<SafeLinkProps> = ({ href, children, className = "", style }) => {
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

  return (
    <button onClick={() => openInNewTab(href)} className={className} style={style}>
      {children}
    </button>
  );
};

export default function OnchainSocialPage() {
  const openInNewTab = (url: string) => { openSecureLink(url); };
  const queryClient = useQueryClient();

  const { data: dashData, isLoading: dashLoading } = useQuery<any>({
    queryKey: ['/api/home/dashboard'],
    queryFn: () => fetch('/api/home/dashboard').then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const tx = dashData?.trending_on_x ?? null;

  const refreshMutation = useMutation({
    mutationFn: () =>
      fetch('/api/home/x-snapshot/refresh', { method: 'POST' })
        .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/home/dashboard'] });
    },
  });

  const isRefreshing   = refreshMutation.isPending || tx?.refresh_in_progress === true;
  const windowOpen     = tx?.refresh_window_open !== false;
  const cooldownRaw    = tx?.next_allowed_refresh_at ?? null;
  const cooldownDate   = cooldownRaw ? new Date(cooldownRaw) : null;
  const inCooldown     = !!(cooldownDate && cooldownDate > new Date() && !windowOpen);
  const isDisabled     = isRefreshing || inCooldown;

  const cooldownLabel  = (() => {
    if (!cooldownDate || !inCooldown) return null;
    const diff = cooldownDate.getTime() - Date.now();
    const m = Math.ceil(diff / 60_000);
    if (m <= 0) return null;
    return m < 60 ? `in ${m}m` : `in ${Math.ceil(m / 60)}h`;
  })();

  return (
    <div className="min-h-screen text-white relative" style={{ background: '#050608', fontFamily: "'Outfit', sans-serif", lineHeight: 1.65 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .social-page .ice { color: #5cc8f0; }
        .social-page .gradient-text {
          background: linear-gradient(135deg, #e0f0ff 0%, #5cc8f0 40%, #2090d0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .social-page .profile-cell:hover { background: rgba(255,255,255,0.03) !important; }
        .social-page .section-card:hover { background: rgba(255,255,255,0.03) !important; }
      `}</style>

      <div className="social-page relative" style={{ zIndex: 1 }}>

        {/* ── Manual X snapshot refresh — top-right ── */}
        <div style={{ position: 'fixed', top: '1rem', right: '1.5rem', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
          <button
            onClick={() => { if (!isDisabled) refreshMutation.mutate(); }}
            disabled={isDisabled}
            title={
              isRefreshing ? 'Refresh in progress…'
              : inCooldown && cooldownLabel ? `Next refresh available ${cooldownLabel}`
              : !windowOpen ? 'Outside refresh window'
              : 'Manually refresh X snapshot data'
            }
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.45rem 0.9rem',
              borderRadius: 8,
              fontSize: '0.7rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.04em',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s',
              background: isRefreshing
                ? 'rgba(56,189,248,0.08)'
                : inCooldown || !windowOpen
                  ? 'rgba(255,255,255,0.03)'
                  : refreshMutation.isError
                    ? 'rgba(239,68,68,0.08)'
                    : 'rgba(56,189,248,0.07)',
              border: isRefreshing
                ? '1px solid rgba(56,189,248,0.35)'
                : inCooldown || !windowOpen
                  ? '1px solid rgba(255,255,255,0.08)'
                  : refreshMutation.isError
                    ? '1px solid rgba(239,68,68,0.3)'
                    : '1px solid rgba(56,189,248,0.22)',
              color: isRefreshing
                ? '#38bdf8'
                : inCooldown || !windowOpen
                  ? '#475569'
                  : refreshMutation.isError
                    ? '#ef4444'
                    : '#7dd3fc',
              opacity: isDisabled ? 0.7 : 1,
            }}
          >
            {/* Spinner or icon */}
            {isRefreshing ? (
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                border: '1.5px solid rgba(56,189,248,0.25)',
                borderTopColor: '#38bdf8',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            )}
            {isRefreshing ? 'Refreshing…' : refreshMutation.isError ? 'Retry' : 'Refresh X Snapshot'}
          </button>

          {/* Sub-label: cooldown or error */}
          {(inCooldown && cooldownLabel) ? (
            <span style={{ fontSize: '0.58rem', color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
              next {cooldownLabel}
            </span>
          ) : refreshMutation.isError ? (
            <span style={{ fontSize: '0.58rem', color: '#ef4444', fontFamily: "'JetBrains Mono', monospace" }}>
              refresh failed
            </span>
          ) : refreshMutation.isSuccess ? (
            <span style={{ fontSize: '0.58rem', color: '#22c55e', fontFamily: "'JetBrains Mono', monospace" }}>
              updated
            </span>
          ) : null}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        <div style={{
          position: 'fixed', top: '-40%', left: '-20%', width: '140%', height: '140%',
          background: 'radial-gradient(ellipse 800px 600px at 20% 15%, rgba(40,160,220,0.04) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 80% 70%, rgba(60,180,240,0.03) 0%, transparent 70%), radial-gradient(ellipse 900px 400px at 50% 50%, rgba(50,170,230,0.02) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0
        }} />

        {/* HERO */}
        <div style={{ padding: '0.6rem 3rem 0', maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
            <div style={{
              position: 'absolute',
              inset: -80,
              background: 'white',
              filter: 'blur(50px)',
              borderRadius: '50%',
              zIndex: 0,
              pointerEvents: 'none',
            }} />
            <img src={socialImage} alt="Caelyn.ai" style={{ width: 260, height: 'auto', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
            <h1 style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.55rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.03em', margin: 0, marginTop: '-58px', position: 'relative', zIndex: 1 }}>
              <span className="gradient-text">Social</span>
            </h1>
            <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0, lineHeight: 1.5, position: 'relative', zIndex: 1 }}>
              Social intelligence and community analytics
            </p>
          </div>
        </div>

        {/* ═══ X Intelligence Snapshot — 4 sections ═══ */}
        <div style={{ marginTop: '0.6rem' }}>
          {dashLoading ? (
            <section style={{ maxWidth: 1400, margin: '0 auto', padding: '0 1.5rem 0' }}>
              <style>{`.x-snap-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.9rem;margin-bottom:1.5rem}@media(max-width:1000px){.x-snap-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.x-snap-grid{grid-template-columns:1fr}}`}</style>
              <div className="x-snap-grid">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ background: '#0a0b1e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', height: 200 }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, height: 14, width: '40%', marginBottom: '0.75rem' }} />
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, height: 42, marginBottom: '0.45rem' }} />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ) : tx ? (
            <XSnapshotSections tx={tx} />
          ) : null}
        </div>

        {/* ═══ Grok Social Agent ═══ */}
        <div style={{ marginTop: '1.5rem' }}>
          <GrokSocialAgent />
        </div>

        {/* StocksX + CryptoX Side by Side */}
        <section style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 3rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'stretch' }}>

          {/* ── Left: Stocks X ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.5rem' }}>StocksX</h3>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem', color: '#e2e8f0' }}>Stocks <span className="ice">X Accounts</span></h2>

          <div style={{ background: 'rgba(10,12,18,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', flex: 1, overflowY: 'auto', maxHeight: '65vh' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
              {[
                { name: 'StockSavvyShay', handle: '@StockSavvyShay' },
                { name: 'HyperTechInvest', handle: '@HyperTechInvest' },
                { name: 'crux_capital_', handle: '@crux_capital_' },
                { name: 'SJCapitalInvest', handle: '@SJCapitalInvest' },
                { name: 'BlackPantherCap', handle: '@BlackPantherCap' },
                { name: 'Kaizen_Investor', handle: '@Kaizen_Investor' },
                { name: 'Venu_7_', handle: '@Venu_7_' },
                { name: 'CKCapitalxx', handle: '@CKCapitalxx' },
                { name: 'TheTape_TNM', handle: '@TheTape_TNM' },
                { name: 'equitydd', handle: '@equitydd' },
                { name: 'Speculator_io', handle: '@Speculator_io' },
                { name: 'DrJebaim', handle: '@DrJebaim' },
                { name: 'StonkValue', handle: '@StonkValue' },
                { name: 'stamatoudism', handle: '@stamatoudism' },
                { name: 'yianisz', handle: '@yianisz' },
                { name: 'sunxliao', handle: '@sunxliao' },
                { name: 'futurist_lens', handle: '@futurist_lens' },
                { name: 'Thomas_james_1', handle: '@Thomas_james_1' },
                { name: 'RebellioMarket', handle: '@RebellioMarket' },
                { name: 'StocksToTrade', handle: '@StocksToTrade' },
                { name: 'Timothy Sykes', handle: '@timothysykes' },
                { name: 'Parangiras', handle: '@Parangiras' },
                { name: 'Real Sheep Wolf', handle: '@realsheepwolf' },
                { name: 'Eric Jackson', handle: '@ericjackson' },
                { name: 'The Long Invest', handle: '@TheLongInvest' },
                { name: 'Davy', handle: '@davyy888' },
                { name: 'PMDiChristina', handle: '@PMDiChristina' },
                { name: 'Joel Goes Digital', handle: '@JoelGoesDigital' },
                { name: 'Scot1andT', handle: '@Scot1andT' },
                { name: 'MACD Master', handle: '@MACDMaster328' },
                { name: 'Spartan Trading', handle: '@SpartanTrading' },
                { name: 'Planert41', handle: '@planert41' },
                { name: 'Maximus Holla', handle: '@Maximus_Holla' },
                { name: 'Canton Meow', handle: '@cantonmeow' },
                { name: 'Donald J Dean', handle: '@donaldjdean' },
                { name: 'AC Investor Blog', handle: '@ACInvestorBlog' },
                { name: 'Cestrian Inc', handle: '@CestrianInc' },
                { name: 'Invest In Assets', handle: '@InvestInAssets' },
                { name: 'Invest Insights', handle: '@investinsights4' },
                { name: 'Bits and Bips', handle: '@bitsandbips' },
                { name: 'BKnight221', handle: '@BKnight221' },
                { name: 'NFT Lunatic', handle: '@NFTLunatic' },
                { name: 'AllISeeIs_W', handle: '@alliseeis_W' },
                { name: 'HyesGregory', handle: '@HyesGregory' },
                { name: 'StockOptionCole', handle: '@StockOptionCole' },
                { name: 'newzage', handle: '@newzage' },
                { name: 'The__Solstice', handle: '@The__Solstice' },
                { name: 'thenewmoney_tnm', handle: '@thenewmoney_tnm' },
                { name: 'aleabitoreddit', handle: '@aleabitoreddit' }
              ].map((account) => (
                <SafeLink
                  key={account.handle}
                  href={`https://x.com/${account.handle.replace('@', '')}`}
                  style={{ padding: '0.6rem 0.9rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                  className="profile-cell"
                >
                  <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#5cc8f0', fontWeight: 500 }}>{account.name}</span>
                </SafeLink>
              ))}
            </div>
          </div>
          </div>
          {/* ── Right: Crypto X ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.5rem' }}>CryptoX</h3>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem', color: '#e2e8f0' }}>Crypto <span className="ice">X Accounts</span></h2>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '65vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Research and Fundamentals */}
          <div style={{ background: 'rgba(10,12,18,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem' }}>Research and Fundamentals</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {[
                'TechDev_52', 'ofvoice25355', 'CoinGurruu', 'stacy_muur', 
                'martypartymusic', 'Defi0xJeff', 'altcoinvector', 'DeFi_Paanda', 
                'cryptorinweb3', 'jkrdoc', 'Agent_rsch', 'OverkillTrading', 
                'dontbuytops', 'MetaverseRanger', 'aixCB_Vc', 'aixbt_agent',
                'nansen_ai', 'rogue_says', 'Globalflows', 'crypto_linn'
              ].map((account) => (
                <SafeLink
                  key={account}
                  href={`https://x.com/${account}`}
                  style={{ padding: '0.6rem 0.9rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                  className="profile-cell"
                >
                  <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#5cc8f0', fontWeight: 500 }}>{account}</span>
                </SafeLink>
              ))}
            </div>
          </div>

          {/* Traders */}
          <div style={{ background: 'rgba(10,12,18,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem' }}>Traders</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {[
                'TheEuroSniper', 'EricCryptoman', 'Whale_AI_net', 'CryptoThannos', 
                'HolderScan', 'Ethimedes', 'MisterSpread', 'CBATrades', 'DigimonCBA',
                'MWhalekiller', 'smileycapital', 'thedefivillain', 'doomsdart', 
                'bitcodyy', 'CryptoDarkSide4', 'DefiSabali', '0xTindorr', 
                'Chroma_Trading', 'follis_', 'AltcoinSniperTA', 'Bitcoinhabebe', 
                'sonder_crypto', 'istudycharts', 'Crypto_Tigers1', 'CryptoLimbo_',
                'cryptoknight890', 'CryptoEmree_', 'spetsnaz_3', 'newzage', 'The__Solstice',
                'jaydee_757', 'EasyInvests', 'sarper_onder', 'XForceGlobal', 'alecTrading', 'redhairshanks86', 'eliz883'
              ].map((account) => (
                <SafeLink
                  key={account}
                  href={`https://x.com/${account}`}
                  style={{ padding: '0.6rem 0.9rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                  className="profile-cell"
                >
                  <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#5cc8f0', fontWeight: 500 }}>{account}</span>
                </SafeLink>
              ))}
              <SafeLink
                href="https://x.com/sonder_crypto/status/1968059158491767121"
                style={{ padding: '0.6rem 0.9rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                className="profile-cell"
              >
                <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#5cc8f0', fontWeight: 500 }}>sonder_crypto</span>
              </SafeLink>
              <SafeLink
                href="https://x.com/alecTrading/status/1971938635097559333"
                style={{ padding: '0.6rem 0.9rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                className="profile-cell"
              >
                <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#5cc8f0', fontWeight: 500 }}>alecTrading</span>
              </SafeLink>
            </div>
          </div>

          {/* Thoughts & Opinions */}
          <div style={{ background: 'rgba(10,12,18,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem' }}>Thoughts & Opinions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {[
                'CryptoZer0_'
              ].map((account) => (
                <SafeLink
                  key={account}
                  href={`https://x.com/${account}`}
                  style={{ padding: '0.6rem 0.9rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                  className="profile-cell"
                >
                  <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#5cc8f0', fontWeight: 500 }}>{account}</span>
                </SafeLink>
              ))}
            </div>
          </div>

          {/* Macro */}
          <div style={{ background: 'rgba(10,12,18,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem' }}>Macro</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {[
                '_The_Prophet__'
              ].map((account) => (
                <SafeLink
                  key={account}
                  href={`https://x.com/${account}`}
                  style={{ padding: '0.6rem 0.9rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                  className="profile-cell"
                >
                  <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#5cc8f0', fontWeight: 500 }}>{account}</span>
                </SafeLink>
              ))}
            </div>
          </div>

          {/* Market Today */}
          <div style={{ background: 'rgba(10,12,18,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem' }}>Market Today</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {[
                'aicryptopattern'
              ].map((account) => (
                <SafeLink
                  key={account}
                  href={`https://x.com/${account}`}
                  style={{ padding: '0.6rem 0.9rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                  className="profile-cell"
                >
                  <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#5cc8f0', fontWeight: 500 }}>{account}</span>
                </SafeLink>
              ))}
            </div>
          </div>

          {/* Chains */}
          <div style={{ background: 'rgba(10,12,18,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '1.25rem' }}>Chains</h3>

            {/* Base and Solana Ecosystems - Side by Side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Base Ecosystem */}
              <div style={{ background: 'rgba(8,10,16,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '1.25rem' }}>
                <h4 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem', textAlign: 'center' }}>Base Ecosystem</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                  {[
                    { handle: 'BaseDailyTK', name: 'Base Daily TK', desc: '@BaseDailyTK - Daily BASE network updates and insights' },
                    { handle: 'MemesOnBase', name: 'Memes On Base', desc: '@MemesOnBase - BASE network meme culture and community' },
                    { handle: 'MemesOnBase_', name: 'Memes On Base', desc: '@MemesOnBase_ - BASE network meme culture and trends' },
                    { handle: 'Shake51_', name: 'Shake51', desc: '@Shake51_ - BASE network trading insights' },
                    { handle: '1CrypticPoet', name: 'CrypticPoet', desc: '@1CrypticPoet - BASE network alpha and trading signals' },
                    { handle: 'jamatto14', name: 'Jamatto14', desc: '@jamatto14 - BASE network insights and updates' },
                    { handle: 'MrGreen_18', name: 'MrGreen_18', desc: '@MrGreen_18 - BASE network trading signals and alpha' },
                    { handle: 'chironchain', name: 'chironchain', desc: '@chironchain - BASE network insights' },
                    { handle: 'goodvimonly', name: 'goodvimonly', desc: '@goodvimonly - BASE network analysis' },
                    { handle: '0x_tesseract', name: '0x_tesseract', desc: '@0x_tesseract - BASE network trading' },
                    { handle: 'Prometheus_The1', name: 'Prometheus_The1', desc: '@Prometheus_The1 - BASE network insights' },
                    { handle: 'lil_louieT', name: 'lil_louieT', desc: '@lil_louieT - BASE network trading' },
                  ].map((account) => (
                    <SafeLink
                      key={account.handle}
                      href={`https://x.com/${account.handle}`}
                      style={{ padding: '0.6rem 0.75rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                      className="profile-cell"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: '#5cc8f0', fontWeight: 500 }}>{account.name}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#475569' }}>{account.desc}</div>
                    </SafeLink>
                  ))}
                </div>
              </div>

              {/* Solana Ecosystem */}
              <div style={{ background: 'rgba(8,10,16,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '1.25rem' }}>
                <h4 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem', textAlign: 'center' }}>Solana Ecosystem</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                  {[
                    { handle: 'Dior100x', name: 'Dior100x', desc: '@Dior100x - Solana trading insights', color: '#5cc8f0' },
                    { handle: '_Shadow36', name: '_Shadow36', desc: '@_Shadow36 - Solana market analysis', color: '#5cc8f0' },
                    { handle: 'WolverCrypto', name: 'WolverCrypto', desc: '@WolverCrypto - Crypto trading insights', color: '#5cc8f0' },
                    { handle: 'watchingmarkets', name: 'watchingmarkets', desc: '@watchingmarkets - Market watching insights', color: '#5cc8f0' },
                    { handle: 'Crypto_Alch', name: 'Crypto_Alch', desc: '@Crypto_Alch - Crypto alchemy insights', color: '#5cc8f0' },
                    { handle: 'bruhbearr', name: 'bruhbearr', desc: '@bruhbearr - Solana trading insights', color: '#5cc8f0' },
                    { handle: 'AltcoinMarksman', name: 'AltcoinMarksman', desc: '@AltcoinMarksman - Solana market analysis', color: '#5cc8f0' },
                  ].map((account) => (
                    <SafeLink
                      key={account.handle}
                      href={`https://x.com/${account.handle}`}
                      style={{ padding: '0.6rem 0.75rem', background: `${account.color}14`, border: `1px solid ${account.color}33`, borderRadius: 6, transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                      className="profile-cell"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: account.color, fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: account.color, fontWeight: 500 }}>{account.name}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#475569' }}>{account.desc}</div>
                    </SafeLink>
                  ))}
                </div>
              </div>
            </div>

            {/* Bittensor and BNB Ecosystems - Side by Side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
              {/* Bittensor Ecosystem */}
              <div style={{ background: 'rgba(8,10,16,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '1.25rem' }}>
                <h4 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem', textAlign: 'center' }}>Bittensor Ecosystem</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                  {[
                    { handle: 'tao_agent', name: 'TAO Agent', desc: '@tao_agent - Bittensor Signal Intelligence', color: '#5cc8f0' },
                    { handle: 'Bitcast_network', name: 'Bitcast Network', desc: '@Bitcast_network - TAO Network Analytics', color: '#5cc8f0' },
                    { handle: 'TaoStacker', name: 'TaoStacker', desc: '@TaoStacker - TAO Staking Insights', color: '#5cc8f0' },
                    { handle: 'TaoIsTheKey', name: 'TaoIsTheKey', desc: '@TaoIsTheKey - TAO Market Analysis', color: '#5cc8f0' },
                    { handle: 'varimotrades', name: 'VARiMOtrading', desc: '@varimotrades - TAO Trading Signals', color: '#5cc8f0' },
                    { handle: '_g_x_g', name: 'GXG', desc: '@_g_x_g - Bittensor Intelligence', color: '#5cc8f0' },
                    { handle: 'TalkingTensor', name: 'Talking Tensor', desc: '@TalkingTensor - Bittensor Insights', color: '#5cc8f0' },
                    { handle: 'Shogun__base', name: 'Shogun Base', desc: '@Shogun__base - Base Network Trading', color: '#5cc8f0' },
                    { handle: 'Victor_crypto_2', name: 'Victor Crypto', desc: '@Victor_crypto_2 - Crypto Market Analysis', color: '#5cc8f0' },
                    { handle: 'btcrenaissance', name: 'BTC Renaissance', desc: '@btcrenaissance - Bittensor Insights', color: '#5cc8f0' },
                  ].map((account) => (
                    <SafeLink
                      key={account.handle}
                      href={`https://x.com/${account.handle}`}
                      style={{ padding: '0.6rem 0.75rem', background: `${account.color}14`, border: `1px solid ${account.color}33`, borderRadius: 6, transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                      className="profile-cell"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: account.color, fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: account.color, fontWeight: 500 }}>{account.name}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#475569' }}>{account.desc}</div>
                    </SafeLink>
                  ))}
                </div>
              </div>

              {/* BNB Ecosystem */}
              <div style={{ background: 'rgba(8,10,16,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '1.25rem' }}>
                <h4 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem', textAlign: 'center' }}>BNB Ecosystem</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                  {[
                    { handle: 'cryptoknight890', name: 'CryptoKnight890', desc: '@cryptoknight890 - BNB ecosystem insights' },
                    { handle: 'BastilleBtc', name: 'BastilleBtc', desc: '@BastilleBtc - BNB trading and insights' },
                    { handle: 'JuliusElum', name: 'JuliusElum', desc: '@JuliusElum - BNB ecosystem analysis' },
                  ].map((account) => (
                    <SafeLink
                      key={account.handle}
                      href={`https://x.com/${account.handle}`}
                      style={{ padding: '0.6rem 0.75rem', background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)', borderRadius: 6, transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
                      className="profile-cell"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#5cc8f0', fontWeight: 700, fontSize: '0.85rem' }}>𝕏</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: '#5cc8f0', fontWeight: 500 }}>{account.name}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#475569' }}>{account.desc}</div>
                    </SafeLink>
                  ))}
                </div>
              </div>
            </div>
          </div>

          </div>
          </div>
          </div>
        </section>

        {/* Platforms Section */}
        <section style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 3rem', position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem' }}>Platforms</h3>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.5rem', color: '#e2e8f0' }}>Social <span className="ice">Media</span></h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <SafeLink
              href='https://substack.com/'
              style={{ background: 'rgba(10,12,18,0.85)', padding: '1.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
              className="section-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📰</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0' }}>Substack</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>Newsletter Publishing Platform</div>
            </SafeLink>

            <SafeLink
              href='https://x.com/home'
              style={{ background: 'rgba(10,12,18,0.85)', padding: '1.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
              className="section-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>𝕏</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0' }}>X</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>Social Media & News Feed</div>
            </SafeLink>

            <SafeLink
              href='https://farcaster.xyz/'
              style={{ background: 'rgba(10,12,18,0.85)', padding: '1.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
              className="section-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🌐</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0' }}>Farcaster</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>Decentralized Social Network</div>
            </SafeLink>
          </div>
        </section>

        {/* Analytics Section */}
        <section style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 3rem', position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.75rem' }}>Analytics</h3>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.5rem', color: '#e2e8f0' }}>AI-Powered <span className="ice">Intelligence</span></h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <SafeLink
              href='https://yaps.kaito.ai/'
              style={{ background: 'rgba(10,12,18,0.85)', padding: '1.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
              className="section-card"
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.5rem' }}>Kaito</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>AI-Powered Social Intelligence</div>
            </SafeLink>

            <SafeLink
              href='https://app.kolytics.pro/leaderboard'
              style={{ background: 'rgba(10,12,18,0.85)', padding: '1.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
              className="section-card"
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.5rem' }}>Kolytics</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>Social Signal Analytics</div>
            </SafeLink>

            <SafeLink
              href='https://www.alphabot.app/pulse'
              style={{ background: 'rgba(10,12,18,0.85)', padding: '1.5rem', transition: 'background 0.2s', cursor: 'pointer', textAlign: 'left' }}
              className="section-card"
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5cc8f0', marginBottom: '0.5rem' }}>Alphabot</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>Social Sentiment Bot</div>
            </SafeLink>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '3rem', textAlign: 'center', color: '#5cc8f0', fontSize: '0.85rem', maxWidth: 880, margin: '2rem auto 0' }}>
          <p style={{ fontSize: '0.75rem', color: '#475569' }}>
            Social intelligence and community analytics
          </p>
        </footer>
      </div>
    </div>
  );
}
