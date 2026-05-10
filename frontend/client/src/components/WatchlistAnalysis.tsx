import { useState } from 'react';

/* ── colour / font tokens (Hyperliquid style) ─────────────────────────── */
const C = {
  bg: '#080c13', card: '#0d1623', card2: '#0a1020',
  border: '#1a2540', text: '#e2e8f0', bright: '#fff',
  dim: '#64748b', green: '#22c55e', red: '#ef4444', blue: '#3b82f6',
  gold: '#f59e0b', purple: '#a855f7', teal: '#0ea5e9',
  font: "'JetBrains Mono','Fira Code',monospace",
  sansFont: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

/* ── types for new API response ────────────────────────────────────────── */
export interface TickerCard {
  symbol: string;
  name?: string;
  price?: number;
  change_pct?: number;
  technical_setup?: string;
  catalyst?: string;
  sentiment?: string;
  key_insight?: string;
  risk_level?: string;
  action_note?: string;
}

export interface AnalysisSection {
  id: string;
  title: string;
  subtitle?: string;
  tickers: TickerCard[];
  canonical_theme_id?: string;
  canonical_theme_name?: string;
}

export interface NewWatchlistData {
  sections: AnalysisSection[];
  market_themes?: Array<string | { canonical_theme_id?: string; canonical_theme_name: string }>;
  last_updated?: string;
}

/* ── legacy types (for backwards compat) ───────────────────────────────── */
interface Stock {
  ticker?: string;
  company?: string;
  signal?: string;
  score?: number;
  thesis?: string;
  catalysts?: string[];
  ps_ratio?: number | string;
  pe_ratio?: number | string;
  pfcf?: number | string;
  why_now?: string;
  sentiment?: string;
  moat?: string;
  reason?: string;
}

interface AvoidItem {
  ticker?: string;
  reason?: string;
  company?: string;
}

interface LegacyWatchlistData {
  display_type: string;
  summary?: string;
  market_context?: string;
  top_buys?: Stock[];
  most_undervalued?: Stock[];
  best_catalysts?: Stock[];
  hidden_gems?: Stock[];
  most_revolutionary?: Stock[];
  right_sector?: Stock[];
  avoid_list?: AvoidItem[];
  [key: string]: any;
}

/* ── section metadata ──────────────────────────────────────────────────── */
const SECTION_META: Record<string, { icon: string; accent: string; gradient: string }> = {
  best_entries:       { icon: '\u25B2', accent: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e08, #22c55e02)' },
  momentum_plays:     { icon: '\u26A1', accent: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b08, #f59e0b02)' },
  catalyst_watch:     { icon: '\uD83C\uDFAF', accent: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f608, #3b82f602)' },
  sector_rotation:    { icon: '\uD83D\uDD04', accent: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a608, #14b8a602)' },
  high_conviction:    { icon: '\uD83D\uDC8E', accent: '#a855f7', gradient: 'linear-gradient(135deg, #a855f708, #a855f702)' },
  contrarian_value:   { icon: '\uD83E\uDDE0', accent: '#ec4899', gradient: 'linear-gradient(135deg, #ec489908, #ec489902)' },
};

function getSectionMeta(id: string) {
  return SECTION_META[id] || { icon: '\u25CF', accent: C.teal, gradient: 'none' };
}

/* ── risk level color ──────────────────────────────────────────────────── */
function riskColor(level?: string): string {
  if (!level) return C.dim;
  const l = level.toLowerCase();
  if (l === 'low') return C.green;
  if (l === 'moderate') return C.gold;
  if (l === 'high') return C.red;
  return C.dim;
}

function riskLabel(level?: string): string {
  if (!level) return 'N/A';
  const l = level.toLowerCase();
  if (l === 'low') return 'LOW RISK';
  if (l === 'moderate') return 'MOD RISK';
  if (l === 'high') return 'HIGH RISK';
  return level.toUpperCase();
}

/* ── sentiment color ───────────────────────────────────────────────────── */
function sentimentColor(sentiment?: string): string {
  if (!sentiment) return C.dim;
  const s = sentiment.toLowerCase();
  if (s.includes('positive') || s.includes('bullish') || s.includes('accumulating')) return C.green;
  if (s.includes('negative') || s.includes('bearish') || s.includes('selling')) return C.red;
  if (s.includes('mixed') || s.includes('neutral')) return C.gold;
  return C.teal;
}

/* ── change percent color ──────────────────────────────────────────────── */
function changeColor(pct?: number): string {
  if (pct === undefined || pct === null) return C.dim;
  if (pct > 0) return C.green;
  if (pct < 0) return C.red;
  return C.dim;
}

/* ── ticker card component ─────────────────────────────────────────────── */
function TickerCardComponent({ ticker, accent, onTickerClick }: {
  ticker: TickerCard;
  accent: string;
  onTickerClick?: (symbol: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const rCol = riskColor(ticker.risk_level);
  const sCol = sentimentColor(ticker.sentiment);
  const cCol = changeColor(ticker.change_pct);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `${accent}08` : C.card,
        border: `1px solid ${hovered ? accent + '40' : C.border}`,
        borderRadius: 8,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* top accent bar */}
      <div style={{ height: 2, background: accent, opacity: hovered ? 1 : 0.4, transition: 'opacity 0.2s' }} />

      {/* header: symbol + price */}
      <div style={{
        padding: '12px 14px 8px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              onClick={onTickerClick ? () => onTickerClick(ticker.symbol) : undefined}
              style={{
                fontSize: 16, fontWeight: 900, fontFamily: C.font,
                color: onTickerClick ? C.teal : C.bright,
                cursor: onTickerClick ? 'pointer' : 'default',
                letterSpacing: '0.02em',
              }}
            >
              {ticker.symbol}
            </span>
            {/* risk badge */}
            <span style={{
              fontSize: 7, fontWeight: 800, fontFamily: C.font,
              padding: '2px 6px', borderRadius: 3,
              color: rCol, background: rCol + '15',
              border: `1px solid ${rCol}30`,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {riskLabel(ticker.risk_level)}
            </span>
          </div>
          {ticker.name && (
            <div style={{
              fontSize: 10, color: C.dim, fontFamily: C.sansFont,
              marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {ticker.name}
            </div>
          )}
        </div>

        {/* price + change */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {ticker.price != null && (
            <div style={{
              fontSize: 15, fontWeight: 800, fontFamily: C.font, color: C.bright,
            }}>
              ${ticker.price.toFixed(2)}
            </div>
          )}
          {ticker.change_pct != null && (
            <div style={{
              fontSize: 11, fontWeight: 700, fontFamily: C.font,
              color: cCol,
              marginTop: 1,
            }}>
              {ticker.change_pct > 0 ? '+' : ''}{ticker.change_pct.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* key insight — the most prominent text */}
      {ticker.key_insight && (
        <div style={{
          padding: '0 14px 10px',
          fontSize: 12, fontWeight: 600, color: accent,
          fontFamily: C.sansFont, lineHeight: 1.55,
        }}>
          {ticker.key_insight}
        </div>
      )}

      {/* technical setup */}
      {ticker.technical_setup && (
        <div style={{ padding: '0 14px 8px' }}>
          <div style={{
            fontSize: 7, fontWeight: 800, color: C.dim, fontFamily: C.font,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3,
          }}>
            TECHNICAL SETUP
          </div>
          <div style={{
            fontSize: 10, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {ticker.technical_setup}
          </div>
        </div>
      )}

      {/* catalyst */}
      {ticker.catalyst && (
        <div style={{ padding: '0 14px 8px' }}>
          <div style={{
            fontSize: 7, fontWeight: 800, color: C.dim, fontFamily: C.font,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3,
          }}>
            CATALYST
          </div>
          <div style={{
            fontSize: 10, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {ticker.catalyst}
          </div>
        </div>
      )}

      {/* sentiment badge */}
      {ticker.sentiment && (
        <div style={{ padding: '0 14px 8px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 4,
            background: sCol + '10',
            border: `1px solid ${sCol}20`,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: sCol, boxShadow: `0 0 4px ${sCol}60`,
            }} />
            <span style={{
              fontSize: 9, color: sCol, fontFamily: C.sansFont, fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240,
            }}>
              {ticker.sentiment}
            </span>
          </div>
        </div>
      )}

      {/* action note — bottom bar */}
      {ticker.action_note && (
        <div style={{
          marginTop: 'auto',
          padding: '8px 14px',
          background: `${accent}06`,
          borderTop: `1px solid ${accent}15`,
          fontSize: 10, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          <span style={{ color: accent, fontWeight: 700, fontStyle: 'normal', fontSize: 8, fontFamily: C.font, letterSpacing: '0.04em' }}>ACTION </span>
          {ticker.action_note}
        </div>
      )}
    </div>
  );
}

/* ── section component ─────────────────────────────────────────────────── */
function SectionBlock({ section, onTickerClick, defaultExpanded }: {
  section: AnalysisSection;
  onTickerClick?: (symbol: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const meta = getSectionMeta(section.id);

  return (
    <div style={{ marginBottom: 4 }}>
      {/* section header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 0',
          borderBottom: expanded ? `1px solid ${meta.accent}20` : `1px solid transparent`,
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'border-color 0.2s',
        }}
      >
        <span style={{
          fontSize: 9, color: C.dim,
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.15s',
          display: 'inline-block',
        }}>{'\u25BC'}</span>
        <span style={{ fontSize: 15 }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 800, fontFamily: C.font,
            color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {section.title}
          </div>
          {section.subtitle && (
            <div style={{
              fontSize: 10, color: C.dim, fontFamily: C.sansFont,
              marginTop: 1,
            }}>
              {section.subtitle}
            </div>
          )}
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, fontFamily: C.font,
          color: meta.accent, background: `${meta.accent}12`,
          padding: '2px 8px', borderRadius: 3, border: `1px solid ${meta.accent}25`,
          flexShrink: 0,
        }}>
          {section.tickers.length}
        </span>
      </div>

      {/* ticker cards grid */}
      {expanded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10,
          paddingTop: 12,
          paddingBottom: 8,
        }}>
          {section.tickers.map((ticker, i) => (
            <TickerCardComponent
              key={`${section.id}-${ticker.symbol || i}`}
              ticker={ticker}
              accent={meta.accent}
              onTickerClick={onTickerClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── main component ────────────────────────────────────────────────────── */
export default function WatchlistAnalysis({ data, onTickerClick }: {
  data: any | undefined | null;
  onTickerClick?: (ticker: string) => void;
}) {
  if (!data) return null;

  // Detect new format vs legacy format
  const isNewFormat = Array.isArray(data.sections);

  if (isNewFormat) {
    const sections: AnalysisSection[] = data.sections || [];
    if (sections.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sections.map((section, idx) => (
          <SectionBlock
            key={section.id}
            section={section}
            onTickerClick={onTickerClick}
            defaultExpanded={idx < 3}
          />
        ))}
      </div>
    );
  }

  // Legacy format fallback
  return <LegacyWatchlistAnalysis data={data} onTickerClick={onTickerClick} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LEGACY FORMAT SUPPORT (backwards compat)
   ═══════════════════════════════════════════════════════════════════════════ */

const CATEGORY_META: Record<string, { icon: string; label: string; accent: string }> = {
  top_buys:          { icon: '\uD83D\uDD25', label: 'Top Buys Right Now',    accent: '#22c55e' },
  most_undervalued:  { icon: '\uD83D\uDC8E', label: 'Most Undervalued',      accent: '#3b82f6' },
  best_catalysts:    { icon: '\u26A1',        label: 'Best Upcoming Catalysts', accent: '#f59e0b' },
  hidden_gems:       { icon: '\uD83D\uDD75\uFE0F', label: 'Hidden Gems',     accent: '#a78bfa' },
  most_revolutionary:{ icon: '\uD83D\uDE80', label: 'Most Revolutionary',     accent: '#ec4899' },
  right_sector:      { icon: '\uD83D\uDCC8', label: 'Right Sector Right Time', accent: '#14b8a6' },
};

const CATEGORY_KEYS = [
  'top_buys', 'most_undervalued', 'best_catalysts',
  'hidden_gems', 'most_revolutionary', 'right_sector',
];

function signalColor(signal?: string): string {
  if (!signal) return C.dim;
  const s = signal.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.includes('STRONGBUY')) return C.green;
  if (s.includes('BUY'))       return C.teal;
  if (s.includes('HOLD'))      return C.gold;
  if (s.includes('AVOID') || s.includes('SELL')) return C.red;
  return C.dim;
}

function LegacyStockCard({ stock, accent, onTickerClick }: { stock: Stock; accent: string; onTickerClick?: (ticker: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sigCol = signalColor(stock.signal);
  const catalysts = stock.catalysts || [];
  const hasValuation = stock.ps_ratio || stock.pe_ratio || stock.pfcf;

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = accent + '60')}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.borderLeftColor = accent; }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span
              onClick={onTickerClick && stock.ticker ? (e) => { e.stopPropagation(); onTickerClick(stock.ticker!); } : undefined}
              style={{
                fontSize: 13, fontWeight: 800, fontFamily: C.font,
                color: onTickerClick && stock.ticker ? C.teal : C.bright,
                cursor: onTickerClick && stock.ticker ? 'pointer' : undefined,
              }}
            >{stock.ticker || '???'}</span>
            {stock.company && <span style={{ fontSize: 10, color: C.dim, fontFamily: C.sansFont }}>{stock.company}</span>}
          </div>
        </div>
        {stock.signal && (
          <span style={{
            padding: '2px 8px', borderRadius: 3,
            fontSize: 8, fontWeight: 800, fontFamily: C.font,
            color: '#000', background: sigCol,
            textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {stock.signal}
          </span>
        )}
        {stock.score != null && (
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${accent}18`, border: `2px solid ${accent}50`, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: accent, fontFamily: C.font }}>{stock.score}</span>
          </div>
        )}
        <span style={{ fontSize: 8, color: C.dim, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>{'\u25BC'}</span>
      </div>
      {stock.thesis && (
        <div style={{ padding: '0 12px 8px', color: C.text, fontSize: 11, lineHeight: 1.6, fontFamily: C.sansFont }}>
          {stock.thesis}
        </div>
      )}
      {catalysts.length > 0 && (
        <div style={{ padding: '0 12px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {catalysts.map((cat, i) => (
            <span key={i} style={{
              padding: '2px 7px', borderRadius: 3,
              fontSize: 8, fontWeight: 600, fontFamily: C.font,
              color: accent, background: `${accent}12`, border: `1px solid ${accent}25`,
            }}>
              {cat}
            </span>
          ))}
        </div>
      )}
      {expanded && (
        <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hasValuation && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {stock.ps_ratio != null && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3px 8px', background: C.bg, borderRadius: 3, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>P/S</span>
                  <span style={{ fontSize: 11, color: C.text, fontWeight: 700, fontFamily: C.font }}>{typeof stock.ps_ratio === 'number' ? stock.ps_ratio.toFixed(1) : stock.ps_ratio}</span>
                </div>
              )}
              {stock.pe_ratio != null && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3px 8px', background: C.bg, borderRadius: 3, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>P/E</span>
                  <span style={{ fontSize: 11, color: C.text, fontWeight: 700, fontFamily: C.font }}>{typeof stock.pe_ratio === 'number' ? stock.pe_ratio.toFixed(1) : stock.pe_ratio}</span>
                </div>
              )}
              {stock.pfcf != null && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3px 8px', background: C.bg, borderRadius: 3, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>P/FCF</span>
                  <span style={{ fontSize: 11, color: C.text, fontWeight: 700, fontFamily: C.font }}>{typeof stock.pfcf === 'number' ? stock.pfcf.toFixed(1) : stock.pfcf}</span>
                </div>
              )}
            </div>
          )}
          {stock.why_now && (
            <div>
              <span style={{ fontSize: 8, fontWeight: 700, color: C.gold, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WHY NOW</span>
              <div style={{ fontSize: 10, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5, marginTop: 2 }}>{stock.why_now}</div>
            </div>
          )}
          {stock.sentiment && (
            <div>
              <span style={{ fontSize: 8, fontWeight: 700, color: C.blue, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SENTIMENT</span>
              <div style={{ fontSize: 10, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5, marginTop: 2 }}>{stock.sentiment}</div>
            </div>
          )}
          {stock.moat && (
            <div style={{ padding: '6px 0 0', borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font }}>MOAT: </span>
              <span style={{ fontSize: 9, color: C.text, fontFamily: C.sansFont }}>{stock.moat}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegacyCategorySection({ catKey, items, meta, onTickerClick, defaultExpanded }: {
  catKey: string;
  items: Stock[];
  meta: { icon: string; label: string; accent: string };
  onTickerClick?: (ticker: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: expanded ? 10 : 0,
          padding: '7px 0',
          borderBottom: `1px solid ${meta.accent}25`,
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{
          fontSize: 9, color: C.dim,
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.15s', display: 'inline-block',
        }}>{'\u25BC'}</span>
        <span style={{ fontSize: 14 }}>{meta.icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 800, fontFamily: C.font,
          color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {meta.label}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, fontFamily: C.font,
          color: meta.accent, background: `${meta.accent}15`,
          padding: '1px 7px', borderRadius: 3, border: `1px solid ${meta.accent}25`,
        }}>
          {items.length}
        </span>
      </div>
      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 8 }}>
          {items.map((stock, i) => (
            <LegacyStockCard key={`${catKey}-${stock.ticker || i}`} stock={stock} accent={meta.accent} onTickerClick={onTickerClick} />
          ))}
        </div>
      )}
    </div>
  );
}

function LegacyWatchlistAnalysis({ data, onTickerClick }: { data: LegacyWatchlistData; onTickerClick?: (ticker: string) => void }) {
  const avoidList = data.avoid_list || [];
  const [avoidExpanded, setAvoidExpanded] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {(data.summary || data.market_context) && (
        <div style={{
          padding: '14px 18px',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${C.teal}`,
          borderRadius: 6,
        }}>
          {data.summary && (
            <div style={{ color: C.text, fontSize: 12, fontWeight: 700, fontFamily: C.sansFont, lineHeight: 1.6, marginBottom: data.market_context ? 6 : 0 }}>
              {data.summary}
            </div>
          )}
          {data.market_context && (
            <div style={{ color: C.dim, fontSize: 11, fontFamily: C.sansFont, lineHeight: 1.6 }}>
              {data.market_context}
            </div>
          )}
        </div>
      )}
      {CATEGORY_KEYS.map((key, idx) => {
        const items: Stock[] = data[key] || [];
        if (items.length === 0) return null;
        const meta = CATEGORY_META[key];
        return (
          <LegacyCategorySection
            key={key}
            catKey={key}
            items={items}
            meta={meta}
            onTickerClick={onTickerClick}
            defaultExpanded={idx < 3}
          />
        );
      })}
      {avoidList.length > 0 && (
        <div>
          <div
            onClick={() => setAvoidExpanded(!avoidExpanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: avoidExpanded ? 10 : 0,
              padding: '7px 0',
              borderBottom: `1px solid ${C.red}25`,
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <span style={{
              fontSize: 9, color: C.dim,
              transform: avoidExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.15s', display: 'inline-block',
            }}>{'\u25BC'}</span>
            <span style={{ fontSize: 14 }}>{'\u26D4'}</span>
            <span style={{
              fontSize: 11, fontWeight: 800, fontFamily: C.font,
              color: C.red, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Avoid
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, fontFamily: C.font,
              color: C.red, background: `${C.red}15`,
              padding: '1px 7px', borderRadius: 3, border: `1px solid ${C.red}25`,
            }}>
              {avoidList.length}
            </span>
          </div>
          {avoidExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {avoidList.map((item, i) => (
                <div key={`avoid-${item.ticker || i}`} style={{
                  padding: '7px 12px',
                  background: `${C.red}08`,
                  border: `1px solid ${C.red}20`,
                  borderLeft: `3px solid ${C.red}`,
                  borderRadius: 4,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span
                    onClick={onTickerClick && item.ticker ? () => onTickerClick(item.ticker!) : undefined}
                    style={{
                      fontSize: 12, fontWeight: 800, fontFamily: C.font,
                      color: onTickerClick && item.ticker ? C.teal : C.red,
                      flexShrink: 0,
                      cursor: onTickerClick && item.ticker ? 'pointer' : undefined,
                    }}
                  >{item.ticker || '???'}</span>
                  {item.company && <span style={{ fontSize: 9, color: C.dim, fontFamily: C.sansFont, flexShrink: 0 }}>{item.company}</span>}
                  <span style={{ fontSize: 10, color: C.text, fontFamily: C.sansFont, flex: 1 }}>{item.reason || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── detection helper (exported for use in message renderers) ───────────── */
export function tryParseWatchlistAnalysis(content: string): any | null {
  if (!content || typeof content !== 'string') return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && (parsed.display_type === 'csv_watchlist_analysis' || Array.isArray(parsed.sections))) return parsed;
  } catch { /* not valid JSON */ }
  return null;
}
