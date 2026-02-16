import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Plus, Trash2, ArrowUpDown, ChevronDown, ChevronRight, Bot, Calendar, TrendingUp, TrendingDown, ExternalLink, RefreshCw, Briefcase } from 'lucide-react';


interface Holding {
  id: string;
  ticker: string;
  shares: number;
  avgCost: number;
  addedAt: string;
}

interface QuoteData {
  symbol: string;
  name: string;
  companyName: string;
  price: number;
  change: number;
  changesPercentage: number;
  previousClose: number;
  sector: string;
  industry: string;
  earningsAnnouncement: string;
  pe: number;
  eps: number;
  marketCap: number;
  volume: number;
}

interface PriceTarget {
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetConsensus: number;
  targetMedian: number;
}

interface EarningsEvent {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
}

interface DividendEvent {
  date: string;
  symbol: string;
  dividend: number;
  adjDividend: number;
  paymentDate: string;
}

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3b82f6',
  'Healthcare': '#22c55e',
  'Financial Services': '#f59e0b',
  'Consumer Cyclical': '#ec4899',
  'Communication Services': '#8b5cf6',
  'Industrials': '#6b7280',
  'Consumer Defensive': '#14b8a6',
  'Energy': '#ef4444',
  'Real Estate': '#a78bfa',
  'Utilities': '#06b6d4',
  'Basic Materials': '#d97706',
  'Unknown': '#4b5563',
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#06b6d4', '#a78bfa', '#d97706', '#6366f1', '#f97316'];

type SortKey = 'ticker' | 'shares' | 'avgCost' | 'currentPrice' | 'dailyPL' | 'totalPL' | 'weight';

export default function StocksPortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [priceTargets, setPriceTargets] = useState<Record<string, PriceTarget>>({});
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [dividends, setDividends] = useState<DividendEvent[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newAvgCost, setNewAvgCost] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('weight');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStage, setAiStage] = useState('');
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesError, setQuotesError] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);

  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch('/api/stock-holdings');
      if (res.ok) {
        const data = await res.json();
        setHoldings(data);
      }
    } catch (err) {
      console.error('Failed to fetch holdings:', err);
    }
  }, []);

  const fetchQuotes = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;
    setLoadingQuotes(true);
    setQuotesError(false);
    try {
      const res = await fetch(`/api/fmp/quotes?symbols=${tickers.join(',')}`);
      if (res.ok) {
        const data: QuoteData[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const map: Record<string, QuoteData> = {};
          data.forEach(q => { map[q.symbol] = q; });
          setQuotes(map);
        } else {
          setQuotesError(true);
        }
      } else {
        setQuotesError(true);
      }
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
      setQuotesError(true);
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  const fetchPriceTargets = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;
    try {
      const res = await fetch(`/api/fmp/price-targets?symbols=${tickers.join(',')}`);
      if (res.ok) {
        const data: PriceTarget[] = await res.json();
        const map: Record<string, PriceTarget> = {};
        data.forEach(t => { if (t) map[t.symbol] = t; });
        setPriceTargets(map);
      }
    } catch (err) {
      console.error('Failed to fetch price targets:', err);
    }
  }, []);

  const fetchEvents = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;
    try {
      const res = await fetch(`/api/fmp/events?symbols=${tickers.join(',')}`);
      if (res.ok) {
        const data = await res.json();
        setEarnings(data.earnings || []);
        setDividends(data.dividends || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, []);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  useEffect(() => {
    const tickers = holdings.map(h => h.ticker);
    if (tickers.length > 0) {
      fetchQuotes(tickers);
      fetchPriceTargets(tickers);
      fetchEvents(tickers);
    }
  }, [holdings, fetchQuotes, fetchPriceTargets, fetchEvents]);

  useEffect(() => {
    if (holdings.length === 0) return;
    const interval = setInterval(() => {
      fetchQuotes(holdings.map(h => h.ticker));
    }, 60000);
    return () => clearInterval(interval);
  }, [holdings, fetchQuotes]);

  const addHolding = async () => {
    if (!newTicker.trim() || !newShares || !newAvgCost) return;
    setAddingHolding(true);
    try {
      const res = await fetch('/api/stock-holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: newTicker.trim(), shares: parseFloat(newShares), avgCost: parseFloat(newAvgCost) }),
      });
      if (res.ok) {
        setNewTicker('');
        setNewShares('');
        setNewAvgCost('');
        await fetchHoldings();
      }
    } catch (err) {
      console.error('Failed to add holding:', err);
    } finally {
      setAddingHolding(false);
    }
  };

  const deleteHolding = async (id: string) => {
    try {
      await fetch(`/api/stock-holdings/${id}`, { method: 'DELETE' });
      await fetchHoldings();
    } catch (err) {
      console.error('Failed to delete holding:', err);
    }
  };

  const enrichedHoldings = useMemo(() => {
    return holdings.map(h => {
      const q = quotes[h.ticker];
      const currentPrice = q?.price || 0;
      const dailyChange = q?.change || 0;
      const dailyPL = dailyChange * h.shares;
      const totalPL = (currentPrice - h.avgCost) * h.shares;
      const totalValue = currentPrice * h.shares;
      return { ...h, currentPrice, dailyChange, dailyPL, totalPL, totalValue, quote: q };
    });
  }, [holdings, quotes]);

  const totalPortfolioValue = useMemo(() => enrichedHoldings.reduce((sum, h) => sum + h.totalValue, 0), [enrichedHoldings]);
  const totalDailyPL = useMemo(() => enrichedHoldings.reduce((sum, h) => sum + h.dailyPL, 0), [enrichedHoldings]);
  const totalOverallPL = useMemo(() => enrichedHoldings.reduce((sum, h) => sum + h.totalPL, 0), [enrichedHoldings]);
  const totalCostBasis = useMemo(() => enrichedHoldings.reduce((sum, h) => sum + (h.avgCost * h.shares), 0), [enrichedHoldings]);

  const sortedHoldings = useMemo(() => {
    const sorted = [...enrichedHoldings];
    sorted.sort((a, b) => {
      let va: number, vb: number;
      switch (sortKey) {
        case 'ticker': return sortAsc ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
        case 'shares': va = a.shares; vb = b.shares; break;
        case 'avgCost': va = a.avgCost; vb = b.avgCost; break;
        case 'currentPrice': va = a.currentPrice; vb = b.currentPrice; break;
        case 'dailyPL': va = a.dailyPL; vb = b.dailyPL; break;
        case 'totalPL': va = a.totalPL; vb = b.totalPL; break;
        case 'weight': va = a.totalValue; vb = b.totalValue; break;
        default: va = 0; vb = 0;
      }
      return sortAsc ? va - vb : vb - va;
    });
    return sorted;
  }, [enrichedHoldings, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sectorData = useMemo(() => {
    const sectors: Record<string, number> = {};
    enrichedHoldings.forEach(h => {
      const sector = h.quote?.sector || 'Unknown';
      sectors[sector] = (sectors[sector] || 0) + h.totalValue;
    });
    return Object.entries(sectors)
      .map(([name, value]) => ({ name, value, pct: totalPortfolioValue > 0 ? ((value / totalPortfolioValue) * 100).toFixed(1) : '0' }))
      .sort((a, b) => b.value - a.value);
  }, [enrichedHoldings, totalPortfolioValue]);

  const plBarData = useMemo(() => {
    return [...enrichedHoldings]
      .sort((a, b) => Math.abs(b.dailyPL) - Math.abs(a.dailyPL))
      .map(h => ({ ticker: h.ticker, dailyPL: parseFloat(h.dailyPL.toFixed(2)), fill: h.dailyPL >= 0 ? '#22c55e' : '#ef4444' }));
  }, [enrichedHoldings]);

  const runAIReview = async () => {
    if (holdings.length === 0) return;
    setAiLoading(true);
    setAiReview(null);
    const stages = ['Analyzing portfolio...', 'Pulling price data...', 'Scanning technicals...', 'Checking fundamentals...', 'Reading sentiment...', 'Building portfolio view...', 'Generating ratings...'];
    let idx = 0;
    setAiStage(stages[0]);
    const iv = setInterval(() => { idx++; if (idx < stages.length) setAiStage(stages[idx]); }, 2000);
    try {
      const holdingsPayload = holdings.map(h => ({
        ticker: h.ticker,
        shares: h.shares,
        avg_cost: h.avgCost,
      }));
      const res = await fetch('/api/portfolio-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: holdingsPayload }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const analysisText = data.message || data.text || data.analysis || 'No analysis returned.';
      setAiReview(analysisText);
    } catch (err: any) {
      setAiReview(`Failed to get portfolio review. Please try again. (${err.message})`);
    } finally {
      clearInterval(iv);
      setAiStage('');
      setAiLoading(false);
    }
  };

  const allEvents = useMemo(() => {
    const events: Array<{ date: string; type: 'earnings' | 'dividend'; symbol: string; detail: string }> = [];
    earnings.forEach(e => {
      events.push({ date: e.date, type: 'earnings', symbol: e.symbol, detail: `EPS Est: ${e.epsEstimated ?? 'N/A'} | ${e.time === 'bmo' ? 'Before Open' : e.time === 'amc' ? 'After Close' : e.time || ''}` });
    });
    dividends.forEach(d => {
      events.push({ date: d.date, type: 'dividend', symbol: d.symbol, detail: `$${d.dividend?.toFixed(4) || '0'}/share | Pay: ${d.paymentDate || 'TBD'}` });
    });
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [earnings, dividends]);

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const fmtPL = (n: number) => (n >= 0 ? '+' : '') + fmt(n);
  const pctPL = (n: number, base: number) => base === 0 ? '0.0%' : ((n / base) * 100).toFixed(1) + '%';

  const SortHeader = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <button onClick={() => handleSort(keyName)} className="flex items-center gap-1 text-xs text-crypto-silver hover:text-white transition-colors font-medium">
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  function escapeHtml(str: string) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatAnalysis(text: string) {
    if (!text) return '';
    const safe = escapeHtml(text);
    return safe
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>')
      .replace(/\n/g, '<br/>');
  }

  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const openInNewTab = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)' }}>
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-4 lg:space-y-6">

          {/* AI Review Button + Summary Stats */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Portfolio Dashboard</h1>
                {holdings.length > 0 && totalPortfolioValue > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-crypto-silver">Total: <span className="text-white font-semibold">{fmt(totalPortfolioValue)}</span></span>
                    <span className={totalDailyPL >= 0 ? 'text-green-400' : 'text-red-400'}>
                      Day: {fmtPL(totalDailyPL)}
                    </span>
                    <span className={totalOverallPL >= 0 ? 'text-green-400' : 'text-red-400'}>
                      Total: {fmtPL(totalOverallPL)} ({pctPL(totalOverallPL, totalCostBasis)})
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {holdings.length > 0 && (
                <>
                  <button onClick={() => fetchQuotes(holdings.map(h => h.ticker))} disabled={loadingQuotes} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-crypto-silver/20 rounded-lg text-sm text-crypto-silver hover:text-white transition-all disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingQuotes ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button onClick={runAIReview} disabled={aiLoading} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20">
                    <Bot className="w-4 h-4" />
                    {aiLoading ? aiStage || 'Analyzing...' : 'AI Portfolio Review'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* AI Review Result */}
          {aiReview && (
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "24px",
              marginTop: "16px",
              lineHeight: "1.7",
              fontSize: "14px",
              color: "#ccc",
              whiteSpace: "pre-wrap",
            }}>
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-semibold text-white">AI Portfolio Analysis</h3>
                <button onClick={() => setAiReview(null)} className="ml-auto text-crypto-silver hover:text-white text-xs">Dismiss</button>
              </div>
              <div dangerouslySetInnerHTML={{ __html: formatAnalysis(aiReview) }} />
            </div>
          )}

          {/* Section 1: Portfolio Input */}
          <GlassCard className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-white">Add Holding</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" placeholder="Ticker (e.g. NVDA)" value={newTicker} onChange={e => setNewTicker(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && addHolding()} className="bg-white/5 border border-crypto-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-crypto-silver/50 focus:outline-none focus:border-blue-500/50 w-full sm:w-36" />
              <input type="number" placeholder="Shares" value={newShares} onChange={e => setNewShares(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHolding()} className="bg-white/5 border border-crypto-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-crypto-silver/50 focus:outline-none focus:border-blue-500/50 w-full sm:w-28" />
              <input type="number" placeholder="Avg Cost ($)" value={newAvgCost} onChange={e => setNewAvgCost(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHolding()} className="bg-white/5 border border-crypto-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-crypto-silver/50 focus:outline-none focus:border-blue-500/50 w-full sm:w-32" />
              <button onClick={addHolding} disabled={addingHolding || !newTicker.trim() || !newShares || !newAvgCost} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40">
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </GlassCard>

          {/* Holdings Table */}
          {holdings.length > 0 && (
            <GlassCard className="p-3 sm:p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-crypto-silver/10">
                      <th className="text-left pb-2 pr-3"><SortHeader label="Ticker" keyName="ticker" /></th>
                      <th className="text-right pb-2 px-3"><SortHeader label="Shares" keyName="shares" /></th>
                      <th className="text-right pb-2 px-3"><SortHeader label="Avg Cost" keyName="avgCost" /></th>
                      <th className="text-right pb-2 px-3"><SortHeader label="Price" keyName="currentPrice" /></th>
                      <th className="text-right pb-2 px-3"><SortHeader label="Daily P&L" keyName="dailyPL" /></th>
                      <th className="text-right pb-2 px-3"><SortHeader label="Total P&L" keyName="totalPL" /></th>
                      <th className="text-right pb-2 px-3"><SortHeader label="Weight%" keyName="weight" /></th>
                      <th className="text-right pb-2 pl-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHoldings.map(h => (
                      <tr key={h.id} className="border-b border-crypto-silver/5 hover:bg-white/5 transition-colors">
                        <td className="py-2.5 pr-3">
                          <div className="font-semibold text-white">{h.ticker}</div>
                          <div className="text-[10px] text-crypto-silver truncate max-w-[120px]">{h.quote?.companyName || h.quote?.name || ''}</div>
                        </td>
                        <td className="text-right py-2.5 px-3 text-crypto-silver">{h.shares}</td>
                        <td className="text-right py-2.5 px-3 text-crypto-silver">{fmt(h.avgCost)}</td>
                        <td className="text-right py-2.5 px-3 text-white font-medium">
                          {loadingQuotes && !h.currentPrice ? <span className="animate-pulse text-crypto-silver">Loading...</span> : quotesError && !h.currentPrice ? <span className="text-yellow-500 text-xs">Unavailable</span> : h.currentPrice > 0 ? fmt(h.currentPrice) : <span className="text-crypto-silver/50">—</span>}
                        </td>
                        <td className={`text-right py-2.5 px-3 font-medium ${h.dailyPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {loadingQuotes && !h.currentPrice ? <span className="animate-pulse text-crypto-silver">...</span> : quotesError && !h.currentPrice ? <span className="text-yellow-500 text-xs">—</span> : h.currentPrice > 0 ? fmtPL(h.dailyPL) : <span className="text-crypto-silver/50">—</span>}
                        </td>
                        <td className={`text-right py-2.5 px-3 font-medium ${h.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {loadingQuotes && !h.currentPrice ? <span className="animate-pulse text-crypto-silver">...</span> : quotesError && !h.currentPrice ? <span className="text-yellow-500 text-xs">—</span> : h.currentPrice > 0 ? <><div>{fmtPL(h.totalPL)}</div><div className="text-[10px] opacity-70">{pctPL(h.totalPL, h.avgCost * h.shares)}</div></> : <span className="text-crypto-silver/50">—</span>}
                        </td>
                        <td className="text-right py-2.5 px-3 text-crypto-silver">
                          {totalPortfolioValue > 0 ? ((h.totalValue / totalPortfolioValue) * 100).toFixed(1) + '%' : <span className="text-crypto-silver/50">—</span>}
                        </td>
                        <td className="text-right py-2.5 pl-3">
                          <button onClick={() => deleteHolding(h.id)} className="text-red-400/50 hover:text-red-400 transition-colors p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totalPortfolioValue > 0 && (
                    <tfoot>
                      <tr className="border-t border-crypto-silver/20">
                        <td colSpan={3} className="py-3 text-right text-xs text-crypto-silver font-medium">TOTAL</td>
                        <td className="text-right py-3 px-3 text-white font-bold">{fmt(totalPortfolioValue)}</td>
                        <td className={`text-right py-3 px-3 font-bold ${totalDailyPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPL(totalDailyPL)}</td>
                        <td className={`text-right py-3 px-3 font-bold ${totalOverallPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPL(totalOverallPL)}</td>
                        <td className="text-right py-3 px-3 text-crypto-silver font-medium">100%</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </GlassCard>
          )}

          {/* Section 2: Portfolio Visualization */}
          {holdings.length > 0 && totalPortfolioValue > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GlassCard className="p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Sector Allocation</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sectorData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value" nameKey="name" label={({ name, pct }) => `${name} ${pct}%`} labelLine={false}>
                        {sectorData.map((entry, i) => (
                          <Cell key={entry.name} fill={SECTOR_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ background: '#111318', border: '1px solid #1a1d25', borderRadius: 8, color: '#c9cdd6', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Daily P&L by Position</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={plBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1d25" />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                      <YAxis type="category" dataKey="ticker" tick={{ fill: '#c9cdd6', fontSize: 11, fontWeight: 600 }} width={50} />
                      <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ background: '#111318', border: '1px solid #1a1d25', borderRadius: 8, color: '#c9cdd6', fontSize: 12 }} />
                      <Bar dataKey="dailyPL" radius={[0, 4, 4, 0]}>
                        {plBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Section 3: Position Health Cards */}
          {holdings.length > 0 && (
            <GlassCard className="p-3 sm:p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Position Details</h3>
              <div className="space-y-2">
                {sortedHoldings.map(h => {
                  const isExpanded = expandedCard === h.id;
                  const target = priceTargets[h.ticker];
                  const q = h.quote;
                  return (
                    <div key={h.id} className="border border-crypto-silver/10 rounded-lg overflow-hidden hover:border-crypto-silver/20 transition-colors">
                      <button onClick={() => setExpandedCard(isExpanded ? null : h.id)} className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-crypto-silver" /> : <ChevronRight className="w-4 h-4 text-crypto-silver" />}
                          <div>
                            <span className="font-semibold text-white text-sm">{h.ticker}</span>
                            <span className="text-crypto-silver text-xs ml-2">{q?.companyName || q?.name || ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-white font-medium text-sm">{h.currentPrice > 0 ? fmt(h.currentPrice) : '—'}</span>
                          <span className={`text-sm font-medium ${h.dailyPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {h.currentPrice > 0 ? fmtPL(h.dailyPL) : '—'}
                          </span>
                          <span className={`text-sm font-medium ${h.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {h.currentPrice > 0 ? fmtPL(h.totalPL) : '—'}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-crypto-silver/10">
                          <div className="rounded-lg overflow-hidden border border-crypto-silver/10 my-3">
                            <iframe
                              src={`https://s.tradingview.com/widgetembed/?symbol=${h.ticker}&interval=D&theme=dark&style=1&locale=en&hide_top_toolbar=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=220`}
                              style={{ width: '100%', height: 220, border: 'none', display: 'block' }}
                              title={`${h.ticker} chart`}
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            {q?.pe && (
                              <div className="bg-white/5 rounded-lg p-2.5">
                                <div className="text-[10px] text-crypto-silver uppercase tracking-wider">P/E Ratio</div>
                                <div className="text-sm font-semibold text-white">{q.pe.toFixed(1)}</div>
                              </div>
                            )}
                            {q?.eps && (
                              <div className="bg-white/5 rounded-lg p-2.5">
                                <div className="text-[10px] text-crypto-silver uppercase tracking-wider">EPS</div>
                                <div className="text-sm font-semibold text-white">${q.eps.toFixed(2)}</div>
                              </div>
                            )}
                            {q?.marketCap && (
                              <div className="bg-white/5 rounded-lg p-2.5">
                                <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Market Cap</div>
                                <div className="text-sm font-semibold text-white">{q.marketCap >= 1e12 ? (q.marketCap / 1e12).toFixed(1) + 'T' : q.marketCap >= 1e9 ? (q.marketCap / 1e9).toFixed(1) + 'B' : (q.marketCap / 1e6).toFixed(0) + 'M'}</div>
                              </div>
                            )}
                            {q?.volume && (
                              <div className="bg-white/5 rounded-lg p-2.5">
                                <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Volume</div>
                                <div className="text-sm font-semibold text-white">{q.volume >= 1e6 ? (q.volume / 1e6).toFixed(1) + 'M' : (q.volume / 1e3).toFixed(0) + 'K'}</div>
                              </div>
                            )}
                            {target && (
                              <>
                                <div className="bg-white/5 rounded-lg p-2.5">
                                  <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Target Consensus</div>
                                  <div className={`text-sm font-semibold ${target.targetConsensus > h.currentPrice ? 'text-green-400' : 'text-red-400'}`}>
                                    ${target.targetConsensus?.toFixed(2)}
                                  </div>
                                  <div className="text-[10px] text-crypto-silver">
                                    {h.currentPrice > 0 ? ((((target.targetConsensus - h.currentPrice) / h.currentPrice) * 100).toFixed(1) + '% upside') : ''}
                                  </div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2.5">
                                  <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Target Range</div>
                                  <div className="text-sm font-semibold text-white">${target.targetLow?.toFixed(0)} – ${target.targetHigh?.toFixed(0)}</div>
                                </div>
                              </>
                            )}
                            {q?.sector && q.sector !== 'Unknown' && (
                              <div className="bg-white/5 rounded-lg p-2.5">
                                <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Sector</div>
                                <div className="text-sm font-semibold text-white">{q.sector}</div>
                              </div>
                            )}
                            {q?.industry && q.industry !== 'Unknown' && (
                              <div className="bg-white/5 rounded-lg p-2.5">
                                <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Industry</div>
                                <div className="text-sm font-semibold text-white">{q.industry}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Section 5: Upcoming Events */}
          {allEvents.length > 0 && (
            <GlassCard className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Upcoming Events</h3>
              </div>
              <div className="space-y-2">
                {allEvents.slice(0, 20).map((evt, i) => {
                  const days = daysUntil(evt.date);
                  const isUrgent = days <= 7;
                  const isEarnings = evt.type === 'earnings';
                  return (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${isEarnings ? (isUrgent ? 'border-orange-500/30 bg-orange-500/5' : 'border-orange-500/10 bg-orange-500/5') : (isUrgent ? 'border-blue-500/30 bg-blue-500/5' : 'border-blue-500/10 bg-blue-500/5')}`}>
                      <div className={`w-2 h-2 rounded-full ${isEarnings ? 'bg-orange-400' : 'bg-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{evt.symbol}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${isEarnings ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {evt.type}
                          </span>
                          {isUrgent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase font-medium">Soon</span>}
                        </div>
                        <div className="text-xs text-crypto-silver mt-0.5">{evt.detail}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-crypto-silver">{new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div className="text-[10px] text-crypto-silver">{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Empty State */}
          {holdings.length === 0 && (
            <GlassCard className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-crypto-silver/30 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">No Holdings Yet</h3>
              <p className="text-sm text-crypto-silver mb-4">Add your first stock holding above to start tracking your portfolio with real-time data, charts, and AI analysis.</p>
            </GlassCard>
          )}

          {/* Section 6: Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 pb-4">
            {[
              { name: 'Schwab', url: 'https://client.schwab.com/clientapps/accounts/summary/', color: 'from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40' },
              { name: 'Robinhood', url: 'https://robinhood.com/us/en/', color: 'from-emerald-500/10 to-emerald-600/10 border-emerald-500/20 hover:border-emerald-400/40' },
              { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/portfolios', color: 'from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 hover:border-yellow-400/40' },
              { name: 'Empower', url: 'https://home.personalcapital.com/page/login/app#/dashboard', color: 'from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:border-purple-400/40' },
              { name: 'Snowball', url: 'https://snowball-analytics.com/dashboard', color: 'from-cyan-500/10 to-cyan-600/10 border-cyan-500/20 hover:border-cyan-400/40' },
              { name: 'Simply Wall St', url: 'https://simplywall.st/portfolio/65b1f9ab-7fa4-4d25-95c6-b8fa93d94d77/holdings', color: 'from-green-500/10 to-green-600/10 border-green-500/20 hover:border-green-400/40' },
            ].map(link => (
              <button key={link.name} onClick={() => openInNewTab(link.url)} className={`bg-gradient-to-br ${link.color} rounded-lg px-3 py-1.5 transition-all duration-300 text-xs text-crypto-silver hover:text-white flex items-center gap-1.5 border`}>
                <ExternalLink className="w-3 h-3" />
                {link.name}
              </button>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
