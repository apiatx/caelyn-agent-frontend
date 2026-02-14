import { useState } from 'react';

const AGENT_BACKEND_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';

interface RowData {
  ticker: string;
  company?: string;
  price?: string;
  change?: string;
  volume?: string;
  setup?: string;
}

interface Technicals {
  rsi?: number;
  sma_20?: number;
  sma_50?: number;
  macd?: number;
  macd_signal?: number;
}

interface AgentResult {
  type: 'screener' | 'analysis' | 'chat';
  analysis: string;
  data?: RowData[];
  tickers?: string[];
  technicals?: Technicals;
}

export default function TradingAgent() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function askAgent() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) throw new Error(`Backend returned status ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getRsiSignal(rsi?: number) {
    if (rsi == null) return null;
    if (rsi > 70) return 'Overbought';
    if (rsi < 30) return 'Oversold';
    return 'Neutral';
  }

  function formatText(text: string) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e0e2e9;">$1</strong>')
      .replace(/\n/g, '<br/>');
  }

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && askAgent()}
          placeholder="Ask anything... e.g. Best trades today, Analyze NVDA, Unusual volume..."
          style={{
            flex: 1, padding: '14px 18px', border: '1px solid #2a2d35',
            borderRadius: 10, background: '#12141a', color: '#e0e2e9',
            fontSize: 14, outline: 'none',
          }}
        />
        <button
          onClick={askAgent}
          style={{
            padding: '12px 24px', background: '#3b82f6', color: 'white',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            fontWeight: 600, fontSize: 14,
          }}
        >
          Analyze
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
          <div style={{
            width: 28, height: 28, margin: '0 auto 14px',
            border: '3px solid #1e2028', borderTopColor: '#3b82f6',
            borderRadius: '50%', animation: 'agent-spin 0.7s linear infinite',
          }} />
          Scanning markets and analyzing data...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          color: '#ef4444', padding: 20, textAlign: 'center',
          background: '#12141a', border: '1px solid #2a2d35', borderRadius: 12,
        }}>
          Could not connect to the trading agent backend.<br />
          <small style={{ color: '#888', marginTop: 8, display: 'block' }}>
            Error: {error}
          </small>
        </div>
      )}

      {/* Screener Table */}
      {result && result.type === 'screener' && (
        <div>
          <div style={{
            background: '#12141a', border: '1px solid #2a2d35',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1a1c24' }}>
                  {['Ticker', 'Name', 'Price', 'Change', 'Volume', 'Setup'].map((h) => (
                    <th key={h} style={{
                      padding: '12px 14px',
                      textAlign: ['Ticker', 'Name', 'Setup'].includes(h) ? 'left' : 'right',
                      color: '#6b7280', fontWeight: 600, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data?.map((row, i) => {
                  const changeVal = parseFloat(row.change || '0');
                  return (
                    <tr key={i} style={{ borderTop: '1px solid #1e2028' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#3b82f6' }}>{row.ticker}</td>
                      <td style={{ padding: '11px 14px', color: '#c9cdd6' }}>{row.company || ''}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', color: '#c9cdd6' }}>{row.price}</td>
                      <td style={{
                        padding: '11px 14px', textAlign: 'right',
                        color: changeVal >= 0 ? '#22c55e' : '#ef4444',
                      }}>{row.change}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', color: '#c9cdd6' }}>{row.volume || ''}</td>
                      <td style={{ padding: '11px 14px', color: '#9ca3af', fontSize: 12, maxWidth: 200 }}>{row.setup || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            style={{
              marginTop: 16, padding: 24, background: '#12141a',
              border: '1px solid #2a2d35', borderRadius: 12,
              color: '#c9cdd6', lineHeight: 1.75, fontSize: 14,
            }}
            dangerouslySetInnerHTML={{ __html: formatText(result.analysis) }}
          />
        </div>
      )}

      {/* Single Stock Analysis */}
      {result && result.type === 'analysis' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Chart */}
            <div style={{
              background: '#12141a', border: '1px solid #2a2d35',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid #2a2d35',
                fontWeight: 600, color: '#e0e2e9', fontSize: 14,
              }}>
                {result.tickers?.[0] || ''} Chart
              </div>
              {result.tickers?.[0] ? (
                <iframe
                  src={`https://s.tradingview.com/widgetembed/?symbol=${result.tickers[0]}&interval=D&theme=dark&style=1&locale=en&hide_top_toolbar=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=360`}
                  style={{ width: '100%', height: 360, border: 'none' }}
                  title="Chart"
                />
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>No chart</div>
              )}
            </div>

            {/* Technicals */}
            <div style={{
              background: '#12141a', border: '1px solid #2a2d35',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid #2a2d35',
                fontWeight: 600, color: '#e0e2e9', fontSize: 14,
              }}>
                Technical Indicators
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 16 }}>
                {[
                  { label: 'RSI', value: result.technicals?.rsi, signal: getRsiSignal(result.technicals?.rsi) },
                  { label: 'SMA 20', value: result.technicals?.sma_20 },
                  { label: 'SMA 50', value: result.technicals?.sma_50 },
                  { label: 'MACD', value: result.technicals?.macd },
                ].map((item) => (
                  <div key={item.label} style={{ background: '#1a1c24', padding: 12, borderRadius: 8 }}>
                    <div style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {item.label}
                    </div>
                    <div style={{ color: '#e0e2e9', fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                      {item.value != null ? Number(item.value).toFixed(2) : 'N/A'}
                    </div>
                    {item.signal && (
                      <div style={{ color: '#3b82f6', fontSize: 11, marginTop: 2 }}>{item.signal}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16, padding: 24, background: '#12141a',
              border: '1px solid #2a2d35', borderRadius: 12,
              color: '#c9cdd6', lineHeight: 1.75, fontSize: 14,
            }}
            dangerouslySetInnerHTML={{ __html: formatText(result.analysis) }}
          />
        </div>
      )}

      {/* Chat Response */}
      {result && result.type === 'chat' && (
        <div
          style={{
            padding: 24, background: '#12141a', border: '1px solid #2a2d35',
            borderRadius: 12, color: '#c9cdd6', lineHeight: 1.75, fontSize: 14,
          }}
          dangerouslySetInnerHTML={{ __html: formatText(result.analysis) }}
        />
      )}

      <style>{`
        @keyframes agent-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
