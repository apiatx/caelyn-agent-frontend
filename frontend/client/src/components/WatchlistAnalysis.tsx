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

/* ── signal → colour map ────────────────────────────────────────────────── */
function signalColor(signal?: string): string {
  if (!signal) return C.dim;
  const s = signal.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.includes('STRONGBUY')) return C.green;
  if (s.includes('BUY'))       return C.teal;
  if (s.includes('HOLD'))      return C.gold;
  if (s.includes('AVOID') || s.includes('SELL')) return C.red;
  return C.dim;
}

/* ── category config ────────────────────────────────────────────────────── */
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

/* ── types ──────────────────────────────────────────────────────────────── */
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

interface WatchlistData {
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

/* ── valuation metric ───────────────────────────────────────────────────── */
function ValMetric({ label, value }: { label: string; value?: number | string }) {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'number' ? value.toFixed(1) : String(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3px 8px', background: C.bg, borderRadius: 3, border: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 11, color: C.text, fontWeight: 700, fontFamily: C.font }}>{display}</span>
    </div>
  );
}

/* ── stock card ──────────────────────────────────────────────────────────── */
function StockCard({ stock, accent, onTickerClick }: { stock: Stock; accent: string; onTickerClick?: (ticker: string) => void }) {
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
      {/* ─ header row ─ */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '9px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span
              onClick={onTickerClick && stock.ticker ? (e) => { e.stopPropagation(); onTickerClick(stock.ticker!); } : undefined}
              style={{
                fontSize: 13, fontWeight: 800, fontFamily: C.font,
                color: onTickerClick && stock.ticker ? C.teal : C.bright,
                cursor: onTickerClick && stock.ticker ? 'pointer' : undefined,
                textDecoration: onTickerClick && stock.ticker ? 'underline' : undefined,
                textDecorationColor: onTickerClick && stock.ticker ? `${C.teal}50` : undefined,
                textUnderlineOffset: 3,
              }}
            >{stock.ticker || '???'}</span>
            {stock.company && <span style={{ fontSize: 10, color: C.dim, fontFamily: C.sansFont }}>{stock.company}</span>}
          </div>
        </div>

        {stock.signal && (
          <span style={{
            padding: '2px 8px', borderRadius: 3,
            fontSize: 8, fontWeight: 800, fontFamily: C.font,
            letterSpacing: '0.06em',
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
            background: `${accent}18`, border: `2px solid ${accent}50`,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: accent, fontFamily: C.font }}>{stock.score}</span>
          </div>
        )}

        <span style={{ fontSize: 8, color: C.dim, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>{'\u25BC'}</span>
      </div>

      {/* ─ thesis ─ */}
      {stock.thesis && (
        <div style={{ padding: '0 12px 8px', color: C.text, fontSize: 11, lineHeight: 1.6, fontFamily: C.sansFont }}>
          {stock.thesis}
        </div>
      )}

      {/* ─ catalysts chips ─ */}
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

      {/* ─ expanded detail ─ */}
      {expanded && (
        <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hasValuation && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <ValMetric label="P/S" value={stock.ps_ratio} />
              <ValMetric label="P/E" value={stock.pe_ratio} />
              <ValMetric label="P/FCF" value={stock.pfcf} />
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

/* ── avoid card ─────────────────────────────────────────────────────────── */
function AvoidCard({ item, onTickerClick }: { item: AvoidItem; onTickerClick?: (ticker: string) => void }) {
  return (
    <div style={{
      padding: '7px 12px',
      background: `${C.red}08`,
      border: `1px solid ${C.red}20`,
      borderLeft: `3px solid ${C.red}`,
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span
        onClick={onTickerClick && item.ticker ? () => onTickerClick(item.ticker!) : undefined}
        style={{
          fontSize: 12, fontWeight: 800, fontFamily: C.font,
          color: onTickerClick && item.ticker ? C.teal : C.red,
          flexShrink: 0,
          cursor: onTickerClick && item.ticker ? 'pointer' : undefined,
          textDecoration: onTickerClick && item.ticker ? 'underline' : undefined,
          textDecorationColor: onTickerClick && item.ticker ? `${C.teal}50` : undefined,
          textUnderlineOffset: 3,
        }}
      >{item.ticker || '???'}</span>
      {item.company && <span style={{ fontSize: 9, color: C.dim, fontFamily: C.sansFont, flexShrink: 0 }}>{item.company}</span>}
      <span style={{ fontSize: 10, color: C.text, fontFamily: C.sansFont, flex: 1 }}>{item.reason || ''}</span>
    </div>
  );
}

/* ── collapsible section ───────────────────────────────────────────────── */
function CategorySection({ catKey, items, meta, onTickerClick, defaultExpanded }: {
  catKey: string;
  items: Stock[];
  meta: { icon: string; label: string; accent: string };
  onTickerClick?: (ticker: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div>
      {/* section header — clickable to collapse/expand */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: expanded ? 10 : 0,
          padding: '7px 0',
          borderBottom: `1px solid ${meta.accent}25`,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{
          fontSize: 9, color: C.dim,
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.15s',
          display: 'inline-block',
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
      {/* stock cards grid */}
      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 8 }}>
          {items.map((stock, i) => (
            <StockCard key={`${catKey}-${stock.ticker || i}`} stock={stock} accent={meta.accent} onTickerClick={onTickerClick} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────────────── */
export default function WatchlistAnalysis({ data, onTickerClick }: { data: WatchlistData; onTickerClick?: (ticker: string) => void }) {
  const avoidList = data.avoid_list || [];
  const [avoidExpanded, setAvoidExpanded] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── header card ── */}
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

      {/* ── category sections (collapsible) ── */}
      {CATEGORY_KEYS.map((key, idx) => {
        const items: Stock[] = data[key] || [];
        if (items.length === 0) return null;
        const meta = CATEGORY_META[key];
        return (
          <CategorySection
            key={key}
            catKey={key}
            items={items}
            meta={meta}
            onTickerClick={onTickerClick}
            defaultExpanded={idx < 3}
          />
        );
      })}

      {/* ── avoid section (collapsible) ── */}
      {avoidList.length > 0 && (
        <div>
          <div
            onClick={() => setAvoidExpanded(!avoidExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: avoidExpanded ? 10 : 0,
              padding: '7px 0',
              borderBottom: `1px solid ${C.red}25`,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{
              fontSize: 9, color: C.dim,
              transform: avoidExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.15s',
              display: 'inline-block',
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
                <AvoidCard key={`avoid-${item.ticker || i}`} item={item} onTickerClick={onTickerClick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── detection helper (exported for use in message renderers) ───────────── */
export function tryParseWatchlistAnalysis(content: string): WatchlistData | null {
  if (!content || typeof content !== 'string') return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && parsed.display_type === 'csv_watchlist_analysis') return parsed as WatchlistData;
  } catch { /* not valid JSON */ }
  return null;
}
