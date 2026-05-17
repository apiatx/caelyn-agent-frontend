import { useState, useCallback, useEffect, useRef, CSSProperties } from 'react';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { useSetScreenContext } from '@/hooks/useSetScreenContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { openSecureLink } from '@/utils/security';
import { resolveTVSymbol } from '@/utils/tvSymbol';

// ─── Grok Agent Constants ─────────────────────────────────────────
const AGENT_BACKEND_URL = "https://fast-api-server-aidanpilon.replit.app";
const AGENT_API_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";

function getToken(): string | null {
  return localStorage.getItem('caelyn_jwt') || sessionStorage.getItem('caelyn_jwt');
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
      { regex: /\b(bullish|buy|strong buy|long|upgrade|breakout|moon|pump|rally|green|accumulate)\b/gi, color: '#5cc8f0' },
      { regex: /\b(bearish|sell|short|downgrade|breakdown|dump|crash|red|distribute|warning|risk|avoid)\b/gi, color: 'rgba(255,255,255,0.4)' },
      { regex: /\b(neutral|hold|mixed|sideways|consolidat\w*|uncertain|wait)\b/gi, color: '#64748b' },
      { regex: /(@\w+)/g, color: '#5cc8f0' },
      { regex: /(\$[A-Z]{1,6})/g, color: '#5cc8f0' },
      { regex: /(Sentiment Score:?\s*\d+\/10|Confidence:?\s*\d+\/10|\d+\/10)/gi, color: '#5cc8f0' },
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
  const sentimentColor = '#5cc8f0';
  const confidenceColor = '#5cc8f0';

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
  const color = '#5cc8f0';
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
    blue: '#5cc8f0', gold: '#5cc8f0', green: '#5cc8f0', red: 'rgba(255,255,255,0.35)',
    purple: '#5cc8f0', dim: '#475569', text: '#94a3b8', bright: '#e2e8f0',
    card: 'rgba(10,12,18,0.85)', border: 'rgba(255,255,255,0.06)',
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
  const src = `https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=100%25&interval=D&range=3M&style=1&toolbar_bg=0b1217&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(symbol)}`;
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
    blue: '#5cc8f0', gold: '#5cc8f0', green: '#5cc8f0', red: 'rgba(255,255,255,0.35)',
    purple: '#5cc8f0', dim: '#475569', text: '#94a3b8', bright: '#e2e8f0',
    card: 'rgba(10,12,18,0.85)', border: 'rgba(255,255,255,0.06)',
  };
  const mp = data.market_pulse || {};
  const hypeRadar: any[] = data.hype_radar || [];
  const picks: any[] = data.consensus_picks || [];
  const spotlight = data.spotlight || null;
  const freshTrades: any[] = data.fresh_trades || [];
  const bias = data.portfolio_bias || '';

  const verdictColor = C.blue;

  const buzzColor = (level: string) => {
    if (/extreme|high|moderate/i.test(level)) return C.blue;
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
                          ? <TradingViewChart key={ticker} symbol={resolveTVSymbol(ticker)} />
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
              const tvSymbol = resolveTVSymbol(pickTicker, p);
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
function XSnapshotSections({ tx, onTickerClick }: {
  tx: any;
  onTickerClick: (sym: string, dataObj?: any, context?: string, name?: string) => void;
}) {

  const C = {
    blue: '#5cc8f0', gold: '#5cc8f0', green: '#5cc8f0', red: 'rgba(255,255,255,0.35)',
    purple: '#5cc8f0', dim: '#475569', text: '#94a3b8', bright: '#e2e8f0',
    card: 'rgba(10,12,18,0.85)', border: 'rgba(255,255,255,0.06)',
  };

  const mp          = tx.market_pulse      || {};
  const bias        = tx.portfolio_bias    || '';
  const topTickers: any[]        = tx.top_tickers || [];
  // theme_leadership.themes is the new sibling key; fall back to key_themes for compatibility
  const keyThemes:  any[]        = tx.theme_leadership?.themes || tx.key_themes || [];
  // sentiment_acceleration is a direct sibling array
  const sentAccel:  any[]        = Array.isArray(tx.sentiment_acceleration) ? tx.sentiment_acceleration : [];
  // freshest_alpha arrives as { trades: [...], spotlight: {...} }
  const faObj              = tx.freshest_alpha ?? null;
  const freshAlpha         = faObj?.spotlight   || tx.spotlight || null;
  const freshTrades: any[] = faObj?.trades       || tx.fresh_trades || [];
  const isStale      = tx.is_stale === true || tx.stale === true;
  const isRefreshing = tx.refresh_in_progress === true;
  const generatedAt  = tx.generated_at ? new Date(tx.generated_at) : null;
  const verdictColor = C.blue;

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

  const sentColor = (s: string | null | undefined) =>
    !s ? C.dim : /bull/i.test(s) ? C.blue : C.dim;

  const buzzColor = (lvl: string) =>
    /extreme|high|moderate/i.test(lvl) ? C.blue : C.dim;

  const cardStyle: CSSProperties = {
    background: 'rgba(10,12,18,0.85)',
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
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.9rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 1000px) {
          .x-snap-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px) {
          .x-snap-grid { grid-template-columns: minmax(0, 1fr); }
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
          <span style={{ color: C.blue, fontSize: '0.58rem', fontFamily: font, fontWeight: 700,
            background: 'rgba(92,200,240,0.08)', border: '1px solid rgba(92,200,240,0.2)',
            borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>STALE</span>
        )}
        {isRefreshing && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.dim, fontSize: '0.6rem', fontFamily: font }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C.blue, opacity: 0.8 }} />
            Refreshing…
          </span>
        )}
      </div>

      {/* ── 4-col → 2-col grid ── */}
      <div className="x-snap-grid">

        {/* ① X Consensus */}
        <div style={cardStyle}>
          {sectionTitle('X Consensus', C.blue, topTickers.length)}
          {topTickers.length === 0 ? emptyState('No consensus data yet.') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, overflowY: 'auto', maxHeight: 480 }}>
              {topTickers.map((t: any, i: number) => {
                const sym = t.symbol || t.ticker;
                return (
                  <div
                    key={sym || i}
                    onClick={() => onTickerClick(sym, t, t.rationale)}
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
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
                    </div>
                    {t.rationale && (
                      <div style={{
                        color: C.text, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.55,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                      }}>
                        {t.rationale}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ② Fresh */}
        <div style={cardStyle}>
          {sectionTitle('Fresh', C.green)}
          {!freshAlpha && freshTrades.length === 0 ? emptyState('No fresh alpha data yet.') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', maxHeight: 480 }}>
              {freshAlpha && (freshAlpha.ticker || freshAlpha.symbol) && (() => {
                const sym = freshAlpha.ticker || freshAlpha.symbol;
                const ctx = freshAlpha.thesis || freshAlpha.reason || freshAlpha.catalyst;
                return (
                  <div
                    onClick={() => onTickerClick(sym, freshAlpha, ctx)}
                    style={{ background: `${C.purple}08`, border: `1px solid ${C.purple}22`, borderRadius: 8, padding: '0.75rem 0.9rem', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ padding: '1px 7px', borderRadius: 100, fontSize: '0.58rem', fontWeight: 700,
                        fontFamily: font, color: C.purple, border: `1px solid ${C.purple}40`,
                        background: `${C.purple}12`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>SPOTLIGHT</span>
                      <span style={{ color: C.purple, fontWeight: 800, fontSize: '0.88rem', fontFamily: font }}>${sym}</span>
                      {freshAlpha.conviction && <ConvictionBadge value={freshAlpha.conviction} />}
                    </div>
                    {freshAlpha.thesis && <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.65 }}>{freshAlpha.thesis}</div>}
                    {freshAlpha.reason && <div style={{ color: C.text, fontSize: '0.72rem', fontFamily: sansFont, lineHeight: 1.65 }}>{freshAlpha.reason}</div>}
                    {freshAlpha.catalyst && <div style={{ color: C.gold, fontSize: '0.68rem', fontFamily: sansFont, marginTop: 4 }}>{freshAlpha.catalyst}</div>}
                    {freshAlpha.first_mentioned_by && <div style={{ color: C.blue, fontSize: '0.62rem', fontFamily: font, marginTop: 4 }}>First by: <a href={`https://x.com/${freshAlpha.first_mentioned_by.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.textDecoration='underline')} onMouseLeave={e => (e.currentTarget.style.textDecoration='none')} onClick={e => e.stopPropagation()}>@{freshAlpha.first_mentioned_by.replace(/^@/, '')}</a></div>}
                  </div>
                );
              })()}
              {freshTrades.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {freshTrades.map((t: any, i: number) => {
                    const sym  = t.ticker || t.symbol;
                    const desc = t.why_fresh || t.entry_thesis || t.thesis || t.rationale || t.reason;
                    return (
                      <div
                        key={i}
                        onClick={() => onTickerClick(sym, t, desc, t.name)}
                        style={{
                          background: C.card,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8, padding: '0.6rem 0.8rem',
                          cursor: 'pointer', transition: 'border-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: desc ? 5 : 0, flexWrap: 'wrap' }}>
                          <span style={{ color: C.green, fontWeight: 800, fontSize: '0.88rem', fontFamily: font }}>${sym}</span>
                          {t.name && <span style={{ color: C.dim, fontSize: '0.62rem', fontFamily: sansFont }}>{t.name}</span>}
                          {t.conviction && <ConvictionBadge value={t.conviction} />}
                          {t.first_mentioned_by && (
                            <a href={`https://x.com/${String(t.first_mentioned_by).replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontSize: '0.58rem', fontFamily: font, textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.textDecoration='underline')} onMouseLeave={e => (e.currentTarget.style.textDecoration='none')} onClick={e => e.stopPropagation()}>@{String(t.first_mentioned_by).replace(/^@/, '')}</a>
                          )}
                        </div>
                        {desc && (
                          <div style={{
                            color: C.text, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.55,
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                          }}>
                            {desc}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ③ Leading Themes */}
        <div style={cardStyle}>
          {sectionTitle('Leading Themes', C.gold, keyThemes.length)}
          {keyThemes.length === 0 ? emptyState('No theme data yet.') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', maxHeight: 480 }}>
              {keyThemes.map((h: any, i: number) => {
                const themeKey = h.theme || h.name || `theme-${i}`;
                return (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.7rem 0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ color: C.bright, fontWeight: 700, fontSize: '0.78rem', fontFamily: font }}>{themeKey}</span>
                    </div>
                    {(h.why_hot || h.description) && (
                      <div style={{ color: C.text, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.55, marginBottom: 8 }}>
                        {h.why_hot || h.description}
                      </div>
                    )}
                    {Array.isArray(h.key_tickers) && h.key_tickers.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {h.key_tickers.map((ticker: string) =>
                          tickerChip(ticker, false, (e: any) => { e.stopPropagation(); onTickerClick(ticker, undefined, undefined); }, C.blue)
                        )}
                      </div>
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
                const sym = item.ticker || item.symbol;
                const ctx = item.thesis || item.reason || item.why_now || item.context;
                return (
                  <div
                    key={sym || i}
                    onClick={() => onTickerClick(sym, item, ctx)}
                    style={{
                      background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '0.65rem 0.85rem', cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                      marginBottom: ctx ? 5 : 0 }}>
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
                      {item.trader_count_delta != null && (
                        <span style={{ color: item.trader_count_delta >= 0 ? C.green : C.red, fontSize: '0.62rem', fontFamily: font }}>
                          traders {item.trader_count_delta >= 0 ? '+' : ''}{item.trader_count_delta}
                        </span>
                      )}
                      {item.buzz_trend && (
                        <span style={{ color: C.gold, fontSize: '0.6rem', fontFamily: font, fontWeight: 700, textTransform: 'uppercase' }}>{item.buzz_trend}</span>
                      )}
                      {item.sentiment && (
                        <span style={{ color: sentColor(item.sentiment), fontSize: '0.6rem', fontFamily: font, fontWeight: 700, textTransform: 'uppercase' }}>{item.sentiment}</span>
                      )}
                    </div>
                    {ctx && (
                      <div style={{ color: C.text, fontSize: '0.68rem', fontFamily: sansFont, lineHeight: 1.55 }}>{ctx}</div>
                    )}
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
            }}>Real-time X/Twitter sentiment</p>
          </div>
        </div>

        {/* Input bar */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Caelyn about X/Twitter sentiment..."
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
                color: '#5cc8f0',
                background: 'rgba(92,200,240,0.08)',
                border: '1px solid rgba(92,200,240,0.2)',
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
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(92,200,240,0.14)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(92,200,240,0.4)';
                }
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(92,200,240,0.08)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(92,200,240,0.2)';
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
                color: '#5cc8f0',
                background: 'rgba(92,200,240,0.08)',
                border: '1px solid rgba(92,200,240,0.2)',
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
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(92,200,240,0.14)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(92,200,240,0.4)';
                }
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(92,200,240,0.08)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(92,200,240,0.2)';
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

// ─── Social/Fundamental Screener ─────────────────────────────────
type ScreenerTab = 'social' | 'fundamental';

const DASH = '—';

function fmtCompact(n: any): string {
  if (n === null || n === undefined || n === '') return DASH;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return DASH;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

function fmtCurrencyCompact(n: any): string {
  if (n === null || n === undefined || n === '') return DASH;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return DASH;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtPercent(n: any, digits = 2): string {
  if (n === null || n === undefined || n === '') return DASH;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return DASH;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(digits)}%`;
}

function fmtRatio(n: any): string {
  if (n === null || n === undefined || n === '') return DASH;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return DASH;
  return `${num.toFixed(2)}x`;
}

function fmtScore(n: any): string {
  if (n === null || n === undefined || n === '') return DASH;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return DASH;
  return `${Math.round(num)}`;
}

function fmtInt(n: any): string {
  if (n === null || n === undefined || n === '') return DASH;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return DASH;
  return `${Math.round(num).toLocaleString()}`;
}

function pctColor(n: any): string {
  if (n === null || n === undefined || n === '') return '#64748b';
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return '#64748b';
  if (num > 0) return '#5cc8f0';
  if (num < 0) return 'rgba(255,255,255,0.3)';
  return '#64748b';
}

function getSortableValue(row: any, key: string): number | string | null {
  const v = row?.[key];
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const num = Number(v);
  if (Number.isFinite(num)) return num;
  return String(v).toLowerCase();
}

interface SectionTickers {
  consensus: Set<string>;
  fresh: Set<string>;
  accel: Set<string>;
}

interface SocialScreenerSectionProps {
  socialScreener: any;
  bundledFundamental: any;
  onTickerClick: (sym: string, dataObj?: any, context?: string, name?: string) => void;
  sectionTickers?: SectionTickers;
}

function SocialScreenerSection({ socialScreener, bundledFundamental, onTickerClick, sectionTickers }: SocialScreenerSectionProps) {
  const [tab, setTab] = useState<ScreenerTab>('social');
  const [search, setSearch] = useState('');
  const [themeFilter, setThemeFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('social_acceleration_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Lazy fundamental state
  const [lazyFundamental, setLazyFundamental] = useState<any>(null);
  const [lazyLoading, setLazyLoading] = useState(false);
  const [lazyError, setLazyError] = useState(false);
  const lazyAttempted = useRef(false);
  const [retryCount, setRetryCount] = useState(0);

  // Strict contract: rows always at .rows — no envelope guessing.
  const bundledFundRows: any[] = Array.isArray(bundledFundamental?.rows) ? bundledFundamental.rows : [];
  const bundledFundIsUsable = bundledFundRows.length > 0;

  const fundamentalData = bundledFundIsUsable ? bundledFundamental : lazyFundamental;

  // When user opens fundamentals tab and bundled is not usable, lazy-fetch.
  // retryCount increments to allow re-fetch after failure.
  useEffect(() => {
    if (tab !== 'fundamental') return;
    if (bundledFundIsUsable) return;
    if (lazyAttempted.current) return;
    lazyAttempted.current = true;
    setLazyLoading(true);
    setLazyError(false);
    let cancelled = false;
    fetch('/api/social/fundamental-screener', { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(json => { if (!cancelled) setLazyFundamental(json); })
      .catch(() => { if (!cancelled) setLazyError(true); })
      .finally(() => { if (!cancelled) setLazyLoading(false); });
    return () => { cancelled = true; };
  }, [tab, bundledFundIsUsable, retryCount]);

  // Reset sort defaults when tab changes
  useEffect(() => {
    if (tab === 'social') {
      setSortKey('social_acceleration_score');
      setSortDir('desc');
    } else {
      setSortKey('market_cap');
      setSortDir('desc');
    }
  }, [tab]);

  // Strict contract: social_screener.rows and fundamental_screener.rows only.
  const socialRows: any[] = Array.isArray(socialScreener?.rows) ? socialScreener.rows : [];
  const lazyFundRows: any[] = Array.isArray(lazyFundamental?.rows) ? lazyFundamental.rows : [];
  const fundRows: any[] = lazyFundRows.length > 0 ? lazyFundRows : bundledFundRows;

  // Theme list from social rows
  const themeOptions = (() => {
    const set = new Set<string>();
    socialRows.forEach(r => { if (r?.theme && typeof r.theme === 'string') set.add(r.theme); });
    return Array.from(set).sort();
  })();

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortRows = (rows: any[]) => {
    const out = [...rows];
    out.sort((a, b) => {
      const av = getSortableValue(a, sortKey);
      const bv = getSortableValue(b, sortKey);
      // Nulls always sort last
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    // Secondary sort for default social view
    if (tab === 'social' && sortKey === 'social_acceleration_score') {
      out.sort((a, b) => {
        const aa = getSortableValue(a, 'social_acceleration_score');
        const bb = getSortableValue(b, 'social_acceleration_score');
        const an = typeof aa === 'number' ? aa : -Infinity;
        const bn = typeof bb === 'number' ? bb : -Infinity;
        if (bn !== an) return sortDir === 'asc' ? an - bn : bn - an;
        const ac = getSortableValue(a, 'consensus_score');
        const bc = getSortableValue(b, 'consensus_score');
        const acn = typeof ac === 'number' ? ac : -Infinity;
        const bcn = typeof bc === 'number' ? bc : -Infinity;
        return bcn - acn;
      });
    }
    return out;
  };

  const filterRows = (rows: any[]) => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (themeFilter && tab === 'social') {
        if ((r?.theme || '') !== themeFilter) return false;
      }
      if (!q) return true;
      const sym = String(r?.symbol || '').toLowerCase();
      const name = String(r?.company_name || '').toLowerCase();
      const theme = String(r?.theme || '').toLowerCase();
      return sym.includes(q) || name.includes(q) || theme.includes(q);
    });
  };

  const displaySocial = sortRows(filterRows(socialRows));
  const displayFund   = sortRows(filterRows(fundRows));

  // ── Styles ───────────────────────────────────────────────────────
  const C = {
    bg: 'rgba(10,12,18,0.85)',
    border: 'rgba(255,255,255,0.06)',
    headerBg: 'rgba(10,12,18,0.95)',
    rowHover: 'rgba(255,255,255,0.03)',
    text: '#e2e8f0',
    dim: '#64748b',
    subtle: '#94a3b8',
    accent: '#5cc8f0',
    purple: '#5cc8f0',
  };

  const cardStyle: CSSProperties = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: '1.25rem 1.25rem 1rem',
    fontFamily: sansFont,
  };

  const thStyle = (align: 'left' | 'right' = 'right'): CSSProperties => ({
    padding: '0.55rem 0.65rem',
    textAlign: align,
    fontFamily: font,
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: C.subtle,
    borderBottom: `1px solid rgba(255,255,255,0.12)`,
    background: C.headerBg,
    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  });

  const tdStyle = (align: 'left' | 'right' = 'right'): CSSProperties => ({
    padding: '0.55rem 0.65rem',
    textAlign: align,
    fontFamily: font,
    fontSize: '0.72rem',
    color: C.text,
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: 'nowrap',
  });

  const sortArrow = (key: string) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const inSection = (set: Set<string> | undefined, sym: string) =>
    !!(set && sym && set.has(sym.toUpperCase()));

  const greenDot = (active: boolean): React.ReactNode => active
    ? <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#5cc8f0', verticalAlign: 'middle' }} />
    : <span style={{ color: C.dim }}>—</span>;

  const tickerCell = (row: any) => {
    const sym  = row.symbol  ?? row.ticker  ?? '';
    const name = row.company_name ?? row.name ?? row.companyName ?? sym;
    return (
      <button
        onClick={() => onTickerClick(sym, row, undefined, name)}
        title={name || sym}
        style={{
          padding: '3px 8px',
          borderRadius: 6,
          background: 'rgba(92,200,240,0.08)',
          border: '1px solid rgba(92,200,240,0.2)',
          color: C.accent,
          fontFamily: font,
          fontWeight: 700,
          fontSize: '0.72rem',
          cursor: 'pointer',
        }}
      >${sym}</button>
    );
  };

  const pctCell = (v: any) => (
    <span style={{ color: pctColor(v), fontWeight: 600 }}>{fmtPercent(v)}</span>
  );

  // Social table column config
  // Each render tries the confirmed snake_case field first, then common camelCase aliases.
  const socialCols: Array<{ key: string; label: string; align?: 'left' | 'right'; render: (r: any) => React.ReactNode }> = [
    { key: 'symbol',                    label: 'Ticker',       align: 'left', render: r => tickerCell(r) },
    { key: 'theme',                     label: 'Theme',        align: 'left', render: r => <span style={{ color: C.subtle }}>{r.theme || DASH}</span> },
    { key: 'market_cap',                label: 'Market Cap',                  render: r => fmtCurrencyCompact(r.market_cap ?? r.marketCap ?? null) },
    { key: 'volume',                    label: 'Volume',                      render: r => r.volume_display || fmtCompact(r.volume ?? r.vol ?? null) },
    { key: 'price_change_1d',           label: '1D',                          render: r => pctCell(r.price_change_1d ?? r.change_percent_1d ?? r.change1d ?? r.changesPercentage ?? r.change_1d ?? null) },
    { key: 'price_change_7d',           label: '7D',                          render: r => pctCell(r.price_change_7d ?? r.performance_7d ?? r.change7d ?? r.performance5d ?? null) },
    { key: 'price_change_30d',          label: '30D',                         render: r => pctCell(r.price_change_30d ?? r.performance_30d ?? r.change30d ?? null) },
    { key: 'price_change_ytd',          label: 'YTD',                         render: r => pctCell(r.price_change_ytd ?? r.performance_ytd ?? r.changeYtd ?? null) },
    { key: 'price_change_1y',           label: '1Y',                          render: r => pctCell(r.price_change_1y ?? r.performance_1y ?? r.change1y ?? null) },
    { key: 'mentions_1d',               label: '1D Mentions',                 render: r => fmtInt(r.mentions_1d ?? r.mentions1d ?? null) },
    { key: 'mentions_7d',               label: '7D Mentions',                 render: r => fmtInt(r.mentions_7d ?? r.mentions7d ?? null) },
    { key: 'consensus_score',           label: 'Consensus',                   render: r => greenDot(inSection(sectionTickers?.consensus, r.symbol ?? r.ticker ?? '')) },
    { key: 'freshness_score',           label: 'Fresh',                       render: r => greenDot(inSection(sectionTickers?.fresh,     r.symbol ?? r.ticker ?? '')) },
    { key: 'social_acceleration_score', label: 'Social Accel',                render: r => greenDot(inSection(sectionTickers?.accel,     r.symbol ?? r.ticker ?? '')) },
  ];

  const fundCols: Array<{ key: string; label: string; align?: 'left' | 'right'; render: (r: any) => React.ReactNode }> = [
    { key: 'symbol',           label: 'Ticker',        align: 'left', render: r => tickerCell(r) },
    { key: 'market_cap',       label: 'Market Cap',                   render: r => fmtCurrencyCompact(r.market_cap ?? r.marketCap ?? null) },
    { key: 'revenue',          label: 'Revenue',                      render: r => fmtCurrencyCompact(r.revenue ?? r.totalRevenue ?? null) },
    { key: 'revenue_growth',   label: 'Rev Growth',                   render: r => pctCell(r.revenue_growth ?? r.revenueGrowth ?? null) },
    { key: 'gross_margin',     label: 'Gross Margin',                 render: r => fmtPercent(r.gross_margin ?? r.grossMargin ?? r.grossMarginTTM ?? null) },
    { key: 'net_income',       label: 'Net Income',                   render: r => fmtCurrencyCompact(r.net_income ?? r.netIncome ?? null) },
    { key: 'eps_diluted',      label: 'EPS',                          render: r => { const eps = r.eps_diluted ?? r.epsDiluted ?? r.eps ?? null; return (eps == null || eps === '') ? DASH : `$${Number(eps).toFixed(2)}`; } },
    { key: 'ebitda',           label: 'EBITDA',                       render: r => fmtCurrencyCompact(r.ebitda ?? r.ebitdaTTM ?? null) },
    { key: 'free_cash_flow',   label: 'Free Cash Flow',               render: r => fmtCurrencyCompact(r.free_cash_flow ?? r.freeCashFlow ?? null) },
    { key: 'total_debt',       label: 'Total Debt',                   render: r => fmtCurrencyCompact(r.total_debt ?? r.totalDebt ?? null) },
    { key: 'debt_to_equity',   label: 'Debt / Equity',                render: r => fmtRatio(r.debt_to_equity ?? r.debtToEquity ?? null) },
    { key: 'current_ratio',    label: 'Current Ratio',                render: r => fmtRatio(r.current_ratio ?? r.currentRatio ?? null) },
    { key: 'ps_ratio',         label: 'P/S',                          render: r => fmtRatio(r.ps_ratio ?? r.priceToSalesRatioTTM ?? null) },
    { key: 'pe_ratio',         label: 'P/E',                          render: r => fmtRatio(r.pe_ratio ?? r.peRatio ?? r.priceEarningsRatioTTM ?? null) },
  ];

  const cols = tab === 'social' ? socialCols : fundCols;
  const displayRows = tab === 'social' ? displaySocial : displayFund;

  // Empty / loading messaging
  const socialEmptyMsg = !socialScreener || socialRows.length === 0
    ? 'Social screener unavailable from latest run.'
    : null;

  const retryFundamental = () => {
    lazyAttempted.current = false;
    setLazyError(false);
    setRetryCount(c => c + 1);
  };

  const fundEmptyMsg = (() => {
    if (tab !== 'fundamental') return null;
    if (fundRows.length > 0) return null;
    if (lazyLoading) return 'Loading fundamentals…';
    if (lazyError) return null;  // handled inline with retry button
    if (lazyAttempted.current) return 'Fundamental data is warming up — please retry in a moment.';
    return null;
  })();

  const enrichmentStatus = socialScreener?.meta?.enrichment_status;
  const cacheStatus = fundamentalData?.meta?.cache_status;
  const marketHoursOpen: boolean | null = socialScreener?.meta?.market_hours_open ?? null;

  const statusBadge = (label: string) => {
    const color = /unavailable|stale|partial/i.test(label) ? 'rgba(255,255,255,0.3)' : C.accent;
    return (
      <span style={{
        padding: '2px 8px', borderRadius: 100, fontSize: '0.58rem', fontFamily: font,
        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        color, border: `1px solid ${color === C.accent ? 'rgba(92,200,240,0.2)' : 'rgba(255,255,255,0.12)'}`,
        background: color === C.accent ? 'rgba(92,200,240,0.08)' : 'rgba(255,255,255,0.04)',
      }}>{label}</span>
    );
  };

  const tabBtn = (id: ScreenerTab, label: string) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: '5px 14px',
        borderRadius: 6,
        fontFamily: font,
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        background: tab === id ? 'rgba(92,200,240,0.12)' : 'transparent',
        border: tab === id ? '1px solid rgba(92,200,240,0.4)' : '1px solid rgba(255,255,255,0.08)',
        color: tab === id ? C.accent : C.subtle,
      }}
    >{label}</button>
  );

  return (
    <section style={{ maxWidth: 1400, margin: '0 auto', padding: '0.5rem 1.5rem 0', position: 'relative', zIndex: 1 }}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.85rem' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontFamily: font, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: C.accent, margin: 0,
            }}>Social Screener</h3>
            <p style={{ margin: '0.35rem 0 0', color: C.subtle, fontSize: '0.78rem', fontFamily: sansFont }}>
              Every ticker mentioned by tracked X accounts, ranked by consensus, freshness, and acceleration.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {tab === 'social' && enrichmentStatus && statusBadge(enrichmentStatus)}
            {tab === 'social' && marketHoursOpen !== null && (
              <span style={{
                fontSize: '0.58rem', fontFamily: font, fontWeight: 500,
                letterSpacing: '0.04em', color: 'rgba(255,255,255,0.22)',
              }}>
                {marketHoursOpen ? '· Market Open' : '· Last Close / Cached'}
              </span>
            )}
            {tab === 'fundamental' && cacheStatus && statusBadge(cacheStatus)}
            {tabBtn('social', 'Social')}
            {tabBtn('fundamental', 'Fundamentals')}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker, company, or theme…"
            style={{
              flex: '1 1 220px',
              minWidth: 0,
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: C.text,
              fontFamily: sansFont,
              fontSize: '0.78rem',
              outline: 'none',
            }}
          />
          {tab === 'social' && themeOptions.length > 0 && (
            <select
              value={themeFilter}
              onChange={e => setThemeFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: C.text,
                fontFamily: sansFont,
                fontSize: '0.78rem',
                outline: 'none',
              }}
            >
              <option value="">All themes</option>
              {themeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <div style={{ alignSelf: 'center', color: C.dim, fontFamily: font, fontSize: '0.65rem' }}>
            {displayRows.length} {displayRows.length === 1 ? 'row' : 'rows'}
          </div>
        </div>

        {/* Body */}
        {tab === 'social' && socialEmptyMsg ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: C.dim, fontSize: '0.78rem', fontFamily: sansFont }}>
            {socialEmptyMsg}
          </div>
        ) : tab === 'fundamental' && lazyError ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: sansFont }}>
            <div style={{ color: C.dim, fontSize: '0.78rem', marginBottom: '0.75rem' }}>
              Could not load fundamentals — the data may still be warming up.
            </div>
            <button
              onClick={retryFundamental}
              style={{
                padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(92,200,240,0.1)', border: '1px solid rgba(92,200,240,0.3)',
                color: C.accent, fontFamily: font, fontSize: '0.7rem', fontWeight: 700,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
            >
              Retry
            </button>
          </div>
        ) : tab === 'fundamental' && fundEmptyMsg ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: C.dim, fontSize: '0.78rem', fontFamily: sansFont }}>
            {fundEmptyMsg}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: tab === 'social' ? 1100 : 1300 }}>
                <thead>
                  <tr>
                    {cols.map(c => (
                      <th key={c.key} style={thStyle(c.align || 'right')} onClick={() => handleSort(c.key)}>
                        {c.label}{sortArrow(c.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={cols.length} style={{ ...tdStyle('left'), color: C.dim, textAlign: 'center', padding: '1.25rem' }}>
                        No matches.
                      </td>
                    </tr>
                  ) : displayRows.map((r, i) => (
                    <tr key={`${r.symbol || 'row'}-${i}`} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      {cols.map(c => (
                        <td key={c.key} style={tdStyle(c.align || 'right')}>
                          {c.render(r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'fundamental' && lazyError && (
          <div style={{ marginTop: '0.6rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontFamily: sansFont }}>
            Could not load fundamental enrichment.
          </div>
        )}
      </div>
    </section>
  );
}

function SocialTickerPopup({
  symbol, tvSymbol, name, context, data, onClose,
}: {
  symbol: string;
  tvSymbol: string;
  name?: string;
  context?: string;
  data?: any;
  onClose: () => void;
}) {
  const tvSrc = `https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=100%25&interval=D&range=3M&style=1&toolbar_bg=0b1217&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(tvSymbol)}`;
  const mentions: any[] = Array.isArray(data?.sample_mentions) && data.sample_mentions.length > 0 ? data.sample_mentions : [];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0b0d12', border: '1px solid rgba(255,255,255,0.09)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em', fontFamily: "'JetBrains Mono', monospace" }}>${symbol}</span>
            {name && <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif" }}>{name}</span>}
            {tvSymbol !== symbol && <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>{tvSymbol}</span>}
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.85rem' }}
          >✕</button>
        </div>
        <div style={{ height: 380 }}>
          <iframe
            key={tvSymbol}
            src={tvSrc}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title={`${symbol} chart`}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
          />
        </div>
        {mentions.length > 0 ? (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', maxHeight: 210, overflowY: 'auto' }}>
            <div style={{ padding: '0.55rem 1.25rem 0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>X Intelligence</span>
              <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.18)', fontFamily: "'JetBrains Mono', monospace" }}>·</span>
              <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', fontFamily: "'Outfit', sans-serif" }}>{mentions.length} accounts</span>
            </div>
            <div style={{ padding: '0 1.25rem 0.75rem' }}>
              {mentions.map((m: any, i: number) => (
                <div
                  key={i}
                  style={{
                    padding: '0.45rem 0',
                    borderBottom: i < mentions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                    <a href={`https://x.com/${String(m.handle).replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.67rem', fontWeight: 700, color: '#5cc8f0', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.textDecoration='underline')} onMouseLeave={e => (e.currentTarget.style.textDecoration='none')} onClick={e => e.stopPropagation()}>@{String(m.handle).replace(/^@/, '')}</a>
                    <span style={{
                      fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '1px 5px', borderRadius: 3,
                      background: 'rgba(92,200,240,0.08)',
                      color: '#5cc8f0',
                      border: '1px solid rgba(92,200,240,0.2)',
                    }}>{m.sentiment}</span>
                    <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.22)', fontFamily: "'Outfit', sans-serif" }}>
                      {m.recency_days === 0 ? 'today' : m.recency_days === 1 ? 'yesterday' : `${m.recency_days}d ago`}
                    </span>
                  </div>
                  {m.thesis && (
                    <div style={{ fontSize: '0.69rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.55, fontFamily: "'Outfit', sans-serif" }}>{m.thesis}</div>
                  )}
                  {Array.isArray(m.catalysts) && m.catalysts.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
                      {m.catalysts.map((cat: string, ci: number) => (
                        <span key={ci} style={{
                          fontSize: '0.54rem', padding: '1px 6px', borderRadius: 3,
                          background: 'rgba(92,200,240,0.06)', border: '1px solid rgba(92,200,240,0.15)',
                          color: 'rgba(255,255,255,0.45)', fontFamily: "'Outfit', sans-serif",
                        }}>{cat}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : context ? (
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontFamily: "'Outfit', sans-serif" }}>{context}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function OnchainSocialPage() {
  const openInNewTab = (url: string) => { openSecureLink(url); };
  const queryClient = useQueryClient();

  const [tickerPopup, setTickerPopup] = useState<{ symbol: string; tvSymbol: string; name?: string; context?: string; data?: any } | null>(null);
  const openTicker = (sym: string, dataObj?: any, context?: string, name?: string) =>
    setTickerPopup({ symbol: sym, tvSymbol: resolveTVSymbol(sym, dataObj), name, context, data: dataObj });

  const { data: dashData, isLoading: dashLoading } = useQuery<any>({
    queryKey: ['/api/social/x-dashboard'],
    queryFn: () => fetch('/api/social/x-dashboard').then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    // staleTime: 0 — always fetch fresh data on page visit so enriched
    // market data (market_cap, volume, price_change_*) is never stale.
    staleTime: 0,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  // Social endpoint returns data flat at the top level (no trending_on_x wrapper)
  const tx = dashData ?? null;

  const refreshMutation = useMutation({
    mutationFn: () =>
      fetch('/api/home/x-snapshot/refresh', { method: 'POST' })
        .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/x-dashboard'] });
    },
  });

  const isRefreshing     = refreshMutation.isPending || tx?.refresh_in_progress === true;

  const _socialCtx = (() => {
    const parts = ['[Page: Social Sentiment — X/Twitter Analysis]'];
    const tickers = (tx?.tickers_discussed || tx?.top_tickers || []).slice(0, 10).map((t: any) => t.ticker || t.symbol || t).filter((t: any) => typeof t === 'string');
    if (tickers.length) parts.push(`Trending tickers on X: ${tickers.join(', ')}`);
    const sentiment = tx?.overall_sentiment || tx?.market_sentiment;
    if (sentiment) parts.push(`Overall X sentiment: ${sentiment}`);
    parts.push('Use for social-driven momentum, retail sentiment, narrative analysis, and what traders are discussing on X right now.');
    return parts.join('\n');
  })();
  useSetPageContext(_socialCtx, [tx]);

  useSetScreenContext((() => {
    const topTickers: any[] = tx?.top_tickers ?? tx?.tickers_discussed ?? [];
    const screenerRows: any[] = tx?.social_screener?.rows ?? [];
    return {
      route: '/app/social',
      page: 'social_x',
      row_count: screenerRows.length,
      visible_rows: screenerRows.slice(0, 25).map((r: any) => ({
        ticker: r.symbol ?? r.ticker,
        name: r.company ?? r.name ?? null,
        theme: r.theme ?? null,
        social_score: r.social_acceleration_score ?? null,
        consensus_score: r.consensus_score ?? null,
        freshness_score: r.freshness_score ?? null,
        price: r.price ?? null,
        change_pct: r.price_change_24h ?? r.change_pct ?? null,
        market_cap: r.market_cap ?? null,
      })),
      extra: {
        trending_tickers: topTickers.slice(0, 15).map((t: any) => t.ticker ?? t.symbol ?? t),
        overall_sentiment: tx?.overall_sentiment ?? tx?.market_sentiment ?? null,
        refresh_in_progress: tx?.refresh_in_progress ?? false,
        snapshot_ts: tx?.snapshot_ts ?? tx?.updated_at ?? null,
      },
      freshness: tx?.snapshot_ts ?? tx?.updated_at ?? undefined,
    };
  })(), [tx]);
  const windowOpen       = tx?.refresh_window_open !== false;
  const autoResumeRaw    = tx?.next_allowed_refresh_at ?? null;
  const autoResumeDate   = autoResumeRaw ? new Date(autoResumeRaw) : null;
  // Button is disabled ONLY when a refresh is already running.
  // next_allowed_refresh_at reflects the AUTO-schedule, not a manual lock —
  // so we never use it to gate the manual button.
  const isDisabled       = isRefreshing;

  // Informational label shown below the button when auto-refresh is paused overnight.
  const autoResumeLabel  = (() => {
    if (windowOpen || !autoResumeDate) return null;
    return autoResumeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago', timeZoneName: 'short' });
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


        <div style={{
          position: 'fixed', top: '-40%', left: '-20%', width: '140%', height: '140%',
          background: 'radial-gradient(ellipse 800px 600px at 20% 15%, rgba(40,160,220,0.04) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 80% 70%, rgba(60,180,240,0.03) 0%, transparent 70%), radial-gradient(ellipse 900px 400px at 50% 50%, rgba(50,170,230,0.02) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0
        }} />

        {/* ═══ X Intelligence Snapshot — 4 sections ═══ */}
        <div style={{ marginTop: '1.25rem' }}>
          {dashLoading ? (
            <section style={{ maxWidth: 1400, margin: '0 auto', padding: '0 1.5rem 0' }}>
              <style>{`.x-snap-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.9rem;margin-bottom:1.5rem}@media(max-width:1000px){.x-snap-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.x-snap-grid{grid-template-columns:minmax(0,1fr)}}`}</style>
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
            <XSnapshotSections tx={tx} onTickerClick={openTicker} />
          ) : null}
        </div>

        {/* ═══ Social Screener (under top sections) ═══ */}
        {tx && (
          <div style={{ marginTop: '1.25rem' }}>
            <SocialScreenerSection
              socialScreener={tx.social_screener}
              bundledFundamental={tx.fundamental_screener}
              onTickerClick={openTicker}
              sectionTickers={{
                consensus: new Set<string>(
                  (tx.top_tickers || []).map((t: any) => String(t.symbol || t.ticker || '').toUpperCase()).filter(Boolean)
                ),
                fresh: new Set<string>([
                  ...((tx.freshest_alpha?.trades || tx.fresh_trades || []).map((t: any) => String(t.ticker || t.symbol || '').toUpperCase())),
                  ...((() => { const sp = tx.freshest_alpha?.spotlight || tx.spotlight; return sp ? [String(sp.ticker || sp.symbol || '').toUpperCase()] : []; })()),
                ].filter(Boolean)),
                accel: new Set<string>(
                  (Array.isArray(tx.sentiment_acceleration) ? tx.sentiment_acceleration : []).map((t: any) => String(t.ticker || t.symbol || '').toUpperCase()).filter(Boolean)
                ),
              }}
            />
          </div>
        )}

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

      {tickerPopup && (
        <SocialTickerPopup
          symbol={tickerPopup.symbol}
          tvSymbol={tickerPopup.tvSymbol}
          name={tickerPopup.name}
          context={tickerPopup.context}
          data={tickerPopup.data}
          onClose={() => setTickerPopup(null)}
        />
      )}
    </div>
  );
}
