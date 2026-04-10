import { useState } from 'react';

/* ── colour / font tokens (mirrors TradingAgent + ChatbotWidget) ────────── */
const C = {
  bg: '#0b0c10', card: '#111318', border: '#1a1d25', text: '#c9cdd6', bright: '#e8eaef',
  dim: '#6b7280', green: '#22c55e', red: '#ef4444', blue: '#3b82f6', gold: '#f59e0b',
  purple: '#a78bfa', teal: '#14b8a6',
};
const font = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
const sansFont = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/* ── signal → colour map ────────────────────────────────────────────────── */
function signalColor(signal?: string): string {
  if (!signal) return C.dim;
  const s = signal.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.includes('STRONGBUY')) return '#22c55e';
  if (s.includes('BUY'))       return '#14b8a6';
  if (s.includes('HOLD'))      return '#f59e0b';
  if (s.includes('AVOID') || s.includes('SELL')) return '#ef4444';
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 10px', background: `${C.bg}`, borderRadius: 4, border: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 9, color: C.dim, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 12, color: C.bright, fontWeight: 700, fontFamily: font }}>{display}</span>
    </div>
  );
}

/* ── stock card ──────────────────────────────────────────────────────────── */
function StockCard({ stock, accent, onTickerClick }: { stock: Stock; accent: string; onTickerClick?: (ticker: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sigCol = signalColor(stock.signal);
  const catalysts = stock.catalysts || [];
  const hasValuation = stock.ps_ratio || stock.pe_ratio || stock.pfcf;
  const hasExtra = stock.why_now || stock.sentiment || stock.moat;

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = accent + '60')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
    >
      {/* ─ header row ─ */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        {/* ticker + company */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              onClick={onTickerClick && stock.ticker ? (e) => { e.stopPropagation(); onTickerClick(stock.ticker!); } : undefined}
              style={{ fontSize: 15, fontWeight: 800, fontFamily: font, color: C.bright, cursor: onTickerClick && stock.ticker ? 'pointer' : undefined, textDecoration: onTickerClick && stock.ticker ? 'underline' : undefined, textDecorationColor: `${accent}50`, textUnderlineOffset: 3 }}
            >{stock.ticker || '???'}</span>
            {stock.company && <span style={{ fontSize: 11, color: C.dim, fontFamily: sansFont }}>{stock.company}</span>}
          </div>
        </div>

        {/* signal pill */}
        {stock.signal && (
          <span style={{
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 800,
            fontFamily: font,
            letterSpacing: '0.06em',
            color: '#000',
            background: sigCol,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {stock.signal}
          </span>
        )}

        {/* score badge */}
        {stock.score != null && (
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${accent}18`,
            border: `2px solid ${accent}50`,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: accent, fontFamily: font }}>{stock.score}</span>
          </div>
        )}

        {/* expand arrow */}
        <span style={{ fontSize: 9, color: C.dim, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>{'\u25BC'}</span>
      </div>

      {/* ─ thesis ─ */}
      {stock.thesis && (
        <div style={{ padding: '0 14px 10px', color: C.text, fontSize: 12, lineHeight: 1.6, fontFamily: sansFont }}>
          {stock.thesis}
        </div>
      )}

      {/* ─ catalysts chips ─ */}
      {catalysts.length > 0 && (
        <div style={{ padding: '0 14px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {catalysts.map((cat, i) => (
            <span key={i} style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 600,
              fontFamily: font,
              color: accent,
              background: `${accent}12`,
              border: `1px solid ${accent}25`,
            }}>
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* ─ expanded detail ─ */}
      {expanded && (
        <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* valuation row */}
          {hasValuation && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <ValMetric label="P/S" value={stock.ps_ratio} />
              <ValMetric label="P/E" value={stock.pe_ratio} />
              <ValMetric label="P/FCF" value={stock.pfcf} />
            </div>
          )}

          {stock.why_now && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WHY NOW</span>
              <div style={{ fontSize: 11, color: C.text, fontFamily: sansFont, lineHeight: 1.5, marginTop: 2 }}>{stock.why_now}</div>
            </div>
          )}

          {stock.sentiment && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SENTIMENT</span>
              <div style={{ fontSize: 11, color: C.text, fontFamily: sansFont, lineHeight: 1.5, marginTop: 2 }}>{stock.sentiment}</div>
            </div>
          )}

          {stock.moat && (
            <div style={{ padding: '6px 0 0', borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 9, color: C.dim, fontFamily: font }}>MOAT: </span>
              <span style={{ fontSize: 10, color: C.text, fontFamily: sansFont }}>{stock.moat}</span>
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
      padding: '8px 12px',
      background: `${C.red}08`,
      border: `1px solid ${C.red}20`,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span
        onClick={onTickerClick && item.ticker ? () => onTickerClick(item.ticker!) : undefined}
        style={{ fontSize: 13, fontWeight: 800, fontFamily: font, color: C.red, flexShrink: 0, cursor: onTickerClick && item.ticker ? 'pointer' : undefined, textDecoration: onTickerClick && item.ticker ? 'underline' : undefined, textDecorationColor: `${C.red}50`, textUnderlineOffset: 3 }}
      >{item.ticker || '???'}</span>
      {item.company && <span style={{ fontSize: 10, color: C.dim, fontFamily: sansFont, flexShrink: 0 }}>{item.company}</span>}
      <span style={{ fontSize: 11, color: C.text, fontFamily: sansFont, flex: 1 }}>{item.reason || ''}</span>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────────────── */
export default function WatchlistAnalysis({ data, onTickerClick }: { data: WatchlistData; onTickerClick?: (ticker: string) => void }) {
  const avoidList = data.avoid_list || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── header card ── */}
      {(data.summary || data.market_context) && (
        <div style={{
          padding: '16px 20px',
          background: `linear-gradient(135deg, ${C.card} 0%, ${C.bg} 100%)`,
          border: `1px solid ${C.blue}20`,
          borderRadius: 10,
        }}>
          {data.summary && (
            <div style={{ color: C.bright, fontSize: 14, fontWeight: 700, fontFamily: sansFont, lineHeight: 1.6, marginBottom: data.market_context ? 8 : 0 }}>
              {data.summary}
            </div>
          )}
          {data.market_context && (
            <div style={{ color: C.text, fontSize: 12, fontFamily: sansFont, lineHeight: 1.6 }}>
              {data.market_context}
            </div>
          )}
        </div>
      )}

      {/* ── category sections ── */}
      {CATEGORY_KEYS.map(key => {
        const items: Stock[] = data[key] || [];
        if (items.length === 0) return null;
        const meta = CATEGORY_META[key];
        return (
          <div key={key}>
            {/* section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              padding: '6px 0',
              borderBottom: `1px solid ${meta.accent}25`,
            }}>
              <span style={{ fontSize: 16 }}>{meta.icon}</span>
              <span style={{
                fontSize: 12,
                fontWeight: 800,
                fontFamily: font,
                color: meta.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {meta.label}
              </span>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>({items.length})</span>
            </div>
            {/* stock cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
              {items.map((stock, i) => (
                <StockCard key={`${key}-${stock.ticker || i}`} stock={stock} accent={meta.accent} onTickerClick={onTickerClick} />
              ))}
            </div>
          </div>
        );
      })}

      {/* ── avoid section ── */}
      {avoidList.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
            padding: '6px 0',
            borderBottom: `1px solid ${C.red}25`,
          }}>
            <span style={{ fontSize: 16 }}>{'\u26D4'}</span>
            <span style={{
              fontSize: 12,
              fontWeight: 800,
              fontFamily: font,
              color: C.red,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Avoid
            </span>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>({avoidList.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {avoidList.map((item, i) => (
              <AvoidCard key={`avoid-${item.ticker || i}`} item={item} onTickerClick={onTickerClick} />
            ))}
          </div>
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
