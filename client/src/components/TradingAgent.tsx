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

interface DashboardRow {
  ticker: string;
  company?: string;
  price?: string;
  change?: string;
  volume?: string;
  market_cap?: string;
  rsi?: string;
  setup?: string;
  catalyst?: string;
  buzz?: string;
  conviction?: string;
}

interface KeyStats {
  [key: string]: any;
}

interface AgentResult {
  type: 'screener' | 'analysis' | 'chat' | 'dashboard';
  analysis: string;
  data?: RowData[];
  tickers?: string[];
  technicals?: Technicals;
  key_stats?: KeyStats;
  ta_setups?: DashboardRow[];
  fundamental_catalysts?: DashboardRow[];
  social_buzz?: DashboardRow[];
  triple_threats?: string[];
}

export default function TradingAgent() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [expandedDashboardRow, setExpandedDashboardRow] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [loadingStage, setLoadingStage] = useState('');

  async function askAgent(customPrompt?: string) {
    const queryText = customPrompt || prompt;
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedRow(null);
    setExpandedDashboardRow(null);
    setPrompt('');

    setLoadingStage('Classifying query...');
    const progressStages = [
      'Scanning market data...',
      'Pulling technicals & volume...',
      'Checking social sentiment...',
      'Analyzing insider activity...',
      'Fetching options flow...',
      'Checking SEC filings...',
      'Reading macro indicators...',
      'Generating analysis with AI...',
    ];
    let stageIndex = 0;
    const progressInterval = setInterval(() => {
      if (stageIndex < progressStages.length) {
        setLoadingStage(progressStages[stageIndex]);
        stageIndex++;
      }
    }, 1800);

    try {
      const res = await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText.trim(),
          history: chatHistory.slice(-20),
        }),
      });
      if (!res.ok) throw new Error(`Backend returned status ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);

      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: queryText.trim() },
        { role: 'assistant', content: data.analysis || '' },
      ]);
    } catch (err: any) {
      if (err.message.includes('429') || err.message.includes('Rate')) {
        setError('Rate limit reached. Please wait a moment before trying again.');
      } else {
        setError(err.message);
      }
    } finally {
      clearInterval(progressInterval);
      setLoadingStage('');
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

  function getConvictionColor(conviction?: string) {
    if (!conviction) return '#6b7280';
    const c = conviction.toLowerCase();
    if (c === 'high' || c === 'strong') return '#22c55e';
    if (c === 'medium' || c === 'moderate') return '#f59e0b';
    if (c === 'low' || c === 'weak') return '#ef4444';
    return '#6b7280';
  }

  function getRsiColor(rsi: number) {
    if (rsi > 70) return '#ef4444';
    if (rsi < 30) return '#22c55e';
    return '#3b82f6';
  }

  function renderDashboardColumn(
    title: string,
    icon: string,
    rows: DashboardRow[] | undefined,
    detailField: 'setup' | 'catalyst' | 'buzz',
    tripleThreats: string[]
  ) {
    if (!rows || rows.length === 0) return null;

    return (
      <div style={{
        background: '#0a0b0f', border: '1px solid #1e2028',
        borderRadius: 12, overflow: 'hidden', flex: 1, minWidth: 320,
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid #1e2028',
          background: '#0d0e13',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e0e2e9' }}>
            {icon} {title}
          </div>
        </div>

        {rows.map((row, i) => {
          const changeVal = parseFloat(row.change || '0');
          const isTriple = tripleThreats.includes(row.ticker);
          const rowKey = `${detailField}-${i}`;
          const isExpanded = expandedDashboardRow === rowKey;

          return (
            <div key={i}>
              <div
                onClick={() => setExpandedDashboardRow(isExpanded ? null : rowKey)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid #1e2028',
                  cursor: 'pointer',
                  background: isExpanded ? '#111318' : isTriple ? '#0d1117' : 'transparent',
                  transition: 'background 0.15s', position: 'relative',
                }}
              >
                {isTriple && (
                  <div style={{
                    position: 'absolute', top: 6, right: 12,
                    fontSize: 8, fontWeight: 700, color: '#f59e0b',
                    background: '#f59e0b15', padding: '2px 6px',
                    borderRadius: 3, border: '1px solid #f59e0b30',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    ⚡ Triple Threat
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: 14 }}>{row.ticker}</span>
                    <span style={{ color: '#6b7280', fontSize: 11 }}>{row.company || ''}</span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    color: getConvictionColor(row.conviction),
                    background: `${getConvictionColor(row.conviction)}15`,
                    border: `1px solid ${getConvictionColor(row.conviction)}30`,
                    textTransform: 'uppercase',
                  }}>
                    {row.conviction || '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: '#e0e2e9', fontWeight: 600 }}>{row.price}</span>
                  <span style={{ color: changeVal >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{row.change}</span>
                  <span style={{ color: '#9ca3af' }}>{row.volume || ''}</span>
                  <span style={{ color: '#6b7280' }}>{row.market_cap || ''}</span>
                </div>

                {row[detailField] && (
                  <div style={{
                    marginTop: 8, fontSize: 11, color: '#9ca3af',
                    lineHeight: 1.5, overflow: 'hidden',
                    maxHeight: isExpanded ? 'none' : 40,
                  }}>
                    {row[detailField]}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div style={{ padding: '0 16px 14px', background: '#111318', borderBottom: '1px solid #1e2028' }}>
                  <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e2028' }}>
                    <iframe
                      src={`https://s.tradingview.com/widgetembed/?symbol=${row.ticker}&interval=D&theme=dark&style=1&locale=en&hide_top_toolbar=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=180`}
                      style={{ width: '100%', height: 180, border: 'none', display: 'block' }}
                      title={`${row.ticker} chart`}
                    />
                  </div>
                  {row.rsi && (
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 4,
                      fontSize: 11, fontWeight: 600,
                      color: getRsiColor(parseFloat(row.rsi)),
                      background: `${getRsiColor(parseFloat(row.rsi))}15`,
                      border: `1px solid ${getRsiColor(parseFloat(row.rsi))}30`,
                    }}>
                      RSI: {row.rsi}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Input Bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askAgent()}
            placeholder="Best small cap trades today... Analyze NVDA... What's the macro outlook..."
            style={{
              flex: 1, padding: '14px 18px', border: '1px solid #2a2d35',
              borderRadius: 10, background: '#0a0b0f', color: '#e0e2e9',
              fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={() => askAgent()}
            disabled={loading}
            style={{
              padding: '12px 28px', background: loading ? '#1e2028' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: loading ? '#555' : 'white', border: 'none', borderRadius: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 14, letterSpacing: '0.02em',
            }}
          >
            {loading ? 'Scanning...' : 'Analyze'}
          </button>
        </div>

        {/* Quick Prompt Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {[
            { label: '🔥 Best Trades Today', prompt: 'Show me the best trades today with full TA, fundamentals, and social buzz' },
            { label: '📊 Full Dashboard', prompt: 'Show me the full dashboard with TA setups, fundamental catalysts, and social buzz' },
            { label: '🚀 Short Squeeze Scan', prompt: 'Scan for the best short squeeze setups right now — high short interest, low float, rising volume, social momentum' },
            { label: '🌍 Macro Overview', prompt: 'Give me a full macro overview — Fed rate, inflation, yield curve, VIX, Fear & Greed, and what it means for trading' },
          ].map((qp) => (
            <button
              key={qp.label}
              onClick={() => askAgent(qp.prompt)}
              disabled={loading}
              style={{
                padding: '6px 14px', background: '#111318', border: '1px solid #1e2028',
                borderRadius: 8, color: '#9ca3af', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#e0e2e9'; }}}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e2028'; e.currentTarget.style.color = '#9ca3af'; }}
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat History Indicator */}
      {chatHistory.length > 0 && !loading && !result && (
        <div style={{
          padding: '10px 16px', background: '#0a0b0f', border: '1px solid #1e2028',
          borderRadius: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>
            {Math.floor(chatHistory.length / 2)} previous message{Math.floor(chatHistory.length / 2) !== 1 ? 's' : ''} in context
          </span>
          <button
            onClick={() => setChatHistory([])}
            style={{
              padding: '4px 10px', background: 'transparent', border: '1px solid #2a2d35',
              borderRadius: 6, color: '#6b7280', fontSize: 11, cursor: 'pointer',
            }}
          >
            Clear History
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <div style={{
            width: 32, height: 32, margin: '0 auto 16px',
            border: '3px solid #1e2028', borderTopColor: '#3b82f6',
            borderRadius: '50%', animation: 'agent-spin 0.7s linear infinite',
          }} />
          <div style={{ fontSize: 14, color: '#c9cdd6', marginBottom: 4 }}>{loadingStage}</div>
          <div style={{ fontSize: 11, color: '#555' }}>
            Polygon · Finviz · StockTwits · Finnhub · SEC EDGAR · FRED · Alpha Vantage · CNN Fear &amp; Greed
          </div>
          {/* Progress Bar */}
          <div style={{
            width: 200, height: 3, background: '#1e2028', borderRadius: 2,
            margin: '16px auto 0', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              borderRadius: 2, animation: 'agent-progress 12s ease-in-out forwards',
            }} />
          </div>
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

      {/* Dashboard View */}
      {result && result.type === 'dashboard' && (
        <div>
          {result.triple_threats && result.triple_threats.length > 0 && (
            <div style={{
              padding: '14px 20px', marginBottom: 16,
              background: 'linear-gradient(135deg, #1a1400 0%, #0a0b0f 100%)',
              border: '1px solid #f59e0b30', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <div>
                <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>TRIPLE THREAT PICKS</div>
                <div style={{ color: '#c9a84c', fontSize: 12, marginTop: 2 }}>
                  Strong TA + fundamental catalyst + social buzz:
                  {' '}{result.triple_threats.map((t, i) => (
                    <span key={t} style={{ fontWeight: 700, color: '#f59e0b' }}>
                      {t}{i < result.triple_threats!.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {renderDashboardColumn('Best TA Setups', '🔥', result.ta_setups, 'setup', result.triple_threats || [])}
            {renderDashboardColumn('Fundamental Catalysts', '📊', result.fundamental_catalysts, 'catalyst', result.triple_threats || [])}
            {renderDashboardColumn('Social Buzz', '🚀', result.social_buzz, 'buzz', result.triple_threats || [])}
          </div>

          <div
            style={{
              padding: 20, background: '#0a0b0f', border: '1px solid #1e2028',
              borderRadius: 12, color: '#c9cdd6', lineHeight: 1.75, fontSize: 13,
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
        @keyframes agent-progress {
          0% { width: 0%; }
          15% { width: 15%; }
          40% { width: 45%; }
          70% { width: 70%; }
          90% { width: 85%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}
