import { Fragment, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { useSetScreenContext } from '@/hooks/useSetScreenContext';
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Plus, Trash2, ArrowUpDown, ChevronDown, ChevronRight, Bot, Calendar, TrendingUp, TrendingDown, ExternalLink, RefreshCw, Briefcase, Pencil, Check, X } from 'lucide-react';
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes';
import { PriceFreshnessBadge } from '@/components/PriceFreshnessBadge';
import { usePortfolioMigration } from '@/hooks/usePortfolioMigration';


interface Lot {
  shares: number;
  price: number;
  date: string;
  notes?: string;
}

interface Holding {
  id: string;
  ticker: string;
  shares: number;
  avgCost: number;
  addedAt: string;
  assetType?: string;
  entry_date?: string;
  lots?: Lot[];
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

const GlassCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-lg ${className}`} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 0 15px rgba(59, 130, 246, 0.05)', borderRadius: 12 }}>
    {children}
  </Card>
);

function WinRateDonut({ winRate }: { winRate: number }) {
  const r = 68, sw = 13, circ = 2 * Math.PI * r;
  const winDash = (winRate / 100) * circ;
  const lossDash = circ - winDash;
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: 170, height: 170 }}>
      <svg className="w-full h-full" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 170 170">
        <circle cx="85" cy="85" r={r} fill="none" stroke="#0d1623" strokeWidth={sw} />
        <circle cx="85" cy="85" r={r} fill="none" stroke="#f87171" strokeWidth={sw}
          strokeDasharray={`${lossDash} ${winDash}`} strokeLinecap="round" />
        <circle cx="85" cy="85" r={r} fill="none" stroke="#4ade80" strokeWidth={sw}
          strokeDasharray={`${winDash} ${lossDash}`} strokeDashoffset={-lossDash} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: '#e2e8f0' }}>{winRate}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#64748b' }}>Win Rate</span>
      </div>
    </div>
  );
}

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
  'Utilities': '#80d8f8',
  'Basic Materials': '#d97706',
  'Crypto': '#f97316',
  'Commodities': '#78716c',
  'ETFs': '#80d8f8',
  'Indices': '#a78bfa',
  'Other': '#4b5563',
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#80d8f8', '#a78bfa', '#d97706', '#2090d0', '#f97316'];

const CRYPTO_TV_SYMBOLS: Record<string, string> = {
  "BTC": "BINANCE:BTCUSDT", "ETH": "BINANCE:ETHUSDT", "SOL": "BINANCE:SOLUSDT",
  "DOGE": "BINANCE:DOGEUSDT", "XRP": "BINANCE:XRPUSDT", "ADA": "BINANCE:ADAUSDT",
  "AVAX": "BINANCE:AVAXUSDT", "LINK": "BINANCE:LINKUSDT", "DOT": "BINANCE:DOTUSDT",
  "UNI": "BINANCE:UNIUSDT", "SHIB": "BINANCE:SHIBUSDT", "NEAR": "BINANCE:NEARUSDT",
  "SUI": "BINANCE:SUIUSDT", "APT": "BINANCE:APTUSDT", "ARB": "BINANCE:ARBUSDT",
  "OP": "BINANCE:OPUSDT", "PEPE": "BINANCE:PEPEUSDT", "FET": "BINANCE:FETUSDT",
  "INJ": "BINANCE:INJUSDT", "RENDER": "BINANCE:RENDERUSDT",
  "FIL": "BINANCE:FILUSDT", "LTC": "BINANCE:LTCUSDT", "BCH": "BINANCE:BCHUSDT",
  "AAVE": "BINANCE:AAVEUSDT", "MATIC": "BINANCE:MATICUSDT",
  "HYPE": "BYBIT:HYPEUSDT", "TAO": "BYBIT:TAOUSDT", "WIF": "BYBIT:WIFUSDT",
  "TIA": "BYBIT:TIAUSDT", "SEI": "BYBIT:SEIUSDT",
};

const COMMODITY_TV_SYMBOLS: Record<string, string> = {
  "SILVER": "TVC:SILVER", "GOLD": "TVC:GOLD", "OIL": "TVC:USOIL",
  "CRUDE": "TVC:USOIL", "NATGAS": "PEPPERSTONE:NATGAS",
  "COPPER": "PEPPERSTONE:COPPER", "PLATINUM": "TVC:PLATINUM",
  "PALLADIUM": "TVC:PALLADIUM", "WHEAT": "PEPPERSTONE:WHEAT",
  "CORN": "PEPPERSTONE:CORN",
};

const INDEX_TV_SYMBOLS: Record<string, string> = {
  "VIX": "AMEX:VIXY", "SPX": "AMEX:SPY", "SPY": "AMEX:SPY", "DJI": "AMEX:DIA",
  "IXIC": "NASDAQ:QQQ", "NDX": "NASDAQ:QQQ", "QQQ": "NASDAQ:QQQ",
  "RUT": "AMEX:IWM", "DXY": "AMEX:UUP", "TNX": "AMEX:TLT",
};

const INDEX_ETF_LABELS: Record<string, string> = {
  "VIX": "VIXY", "SPX": "SPY", "DJI": "DIA", "IXIC": "QQQ",
  "NDX": "QQQ", "RUT": "IWM", "DXY": "UUP", "TNX": "TLT",
};

const CRYPTO_DISPLAY_NAMES: Record<string, string> = {
  "BTC": "Bitcoin", "ETH": "Ethereum", "SOL": "Solana", "HYPE": "Hyperliquid",
  "DOGE": "Dogecoin", "XRP": "Ripple", "ADA": "Cardano", "AVAX": "Avalanche",
  "LINK": "Chainlink", "DOT": "Polkadot", "UNI": "Uniswap", "SHIB": "Shiba Inu",
  "NEAR": "NEAR Protocol", "SUI": "Sui", "APT": "Aptos", "ARB": "Arbitrum",
  "OP": "Optimism", "PEPE": "Pepe", "WIF": "dogwifhat", "RENDER": "Render",
  "FET": "Fetch.ai", "TAO": "Bittensor", "FIL": "Filecoin", "INJ": "Injective",
  "TIA": "Celestia", "SEI": "Sei", "LTC": "Litecoin", "AAVE": "Aave",
  "MATIC": "Polygon", "BCH": "Bitcoin Cash",
};

function getTradingViewSymbol(ticker: string, assetType?: string, tvSymbolFromQuote?: string): string {
  if (tvSymbolFromQuote) return tvSymbolFromQuote;
  const t = (ticker || '').toUpperCase();
  const type = (assetType || 'stock').toLowerCase();
  if (type === 'crypto' || type === 'cryptocurrency') return CRYPTO_TV_SYMBOLS[t] || `BINANCE:${t}USDT`;
  if (type === 'commodity' || type === 'commodities') return COMMODITY_TV_SYMBOLS[t] || t;
  return t;
}

function getDisplayName(ticker: string, assetType: string | undefined, quoteName?: string): string {
  if (assetType === 'crypto') return CRYPTO_DISPLAY_NAMES[ticker.toUpperCase()] || quoteName || ticker;
  return quoteName || ticker;
}

const SHARES_LABEL: Record<string, string> = {
  stock: 'Shares', etf: 'Shares', index: 'Units', crypto: 'Amount', commodity: 'Units',
};

const INDEX_TO_ETF: Record<string, { etf: string; name: string; index: string }> = {
  'SPX': { etf: 'SPY', name: 'SPDR S&P 500 ETF', index: 'S&P 500' },
  'GSPC': { etf: 'SPY', name: 'SPDR S&P 500 ETF', index: 'S&P 500' },
  'DJI': { etf: 'DIA', name: 'SPDR Dow Jones ETF', index: 'Dow Jones' },
  'DJIA': { etf: 'DIA', name: 'SPDR Dow Jones ETF', index: 'Dow Jones' },
  'IXIC': { etf: 'QQQ', name: 'Invesco QQQ Trust', index: 'NASDAQ Composite' },
  'NDX': { etf: 'QQQ', name: 'Invesco QQQ Trust', index: 'NASDAQ 100' },
  'RUT': { etf: 'IWM', name: 'iShares Russell 2000 ETF', index: 'Russell 2000' },
  'VIX': { etf: 'UVXY', name: 'ProShares Ultra VIX Short-Term Futures ETF', index: 'VIX' },
};

type SortKey = 'ticker' | 'shares' | 'avgCost' | 'currentPrice' | 'dailyPL' | 'totalPL' | 'weight';

export default function StocksPortfolioPage() {
  const queryClient = useQueryClient();
  usePortfolioMigration();
  // Share the same React Query cache key as caelyn-terminal-page's dashboardHoldings
  // so the two callers collapse to a single /api/stock-holdings request per load.
  const { data: holdingsData } = useQuery<Holding[]>({
    queryKey: ['stock-holdings'],
    queryFn: async () => {
      const res = await fetch('/api/stock-holdings');
      if (!res.ok) throw new Error('Failed to fetch holdings');
      return res.json();
    },
    staleTime: 60_000,
  });
  const holdings: Holding[] = holdingsData ?? [];
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [priceTargets, setPriceTargets] = useState<Record<string, PriceTarget>>({});
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [dividends, setDividends] = useState<DividendEvent[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newAvgCost, setNewAvgCost] = useState('');
  const [newDateAdded, setNewDateAdded] = useState(() => new Date().toISOString().split('T')[0]);
  const { data: closedTradesData, refetch: refetchClosedTrades } = useQuery<{ closed_trades: any[]; trade_groups: any[]; count: number }>({
    queryKey: ['portfolio-closed-trades'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/closed-trades');
      if (!res.ok) return { closed_trades: [], trade_groups: [], count: 0 };
      return res.json();
    },
    staleTime: 30_000,
  });
  const tradeHistory: any[] = closedTradesData?.closed_trades ?? [];
  // trade_groups is the new grouped view — one card per trade lifecycle
  const tradeGroups: any[] = closedTradesData?.trade_groups ?? [];

  // Summary computed from trade groups (one group = one position's full lifecycle)
  const tradeSummary = useMemo(() => {
    const groups = tradeGroups.length ? tradeGroups : tradeHistory;
    if (!groups.length) return null;
    const pnlKey   = tradeGroups.length ? 'total_realized_pnl'     : 'realized_pnl';
    const pctKey   = tradeGroups.length ? 'total_realized_pnl_pct'  : 'realized_pnl_pct';
    const daysKey  = tradeGroups.length ? 'holding_period_days'      : 'holding_period_days';
    const tickerFn = (g: any) => (tradeGroups.length ? g.ticker : (g.symbol ?? g.ticker ?? '')) ?? '';
    const totalPnl = groups.reduce((s: number, g: any) => s + (g[pnlKey] ?? 0), 0);
    const wins     = groups.filter((g: any) => (g[pnlKey] ?? 0) > 0);
    const sorted   = [...groups].sort((a, b) => (b[pctKey] ?? 0) - (a[pctKey] ?? 0));
    const avgDays  = groups.reduce((s: number, g: any) => s + (g[daysKey] ?? 0), 0) / groups.length;
    return {
      total_trades: groups.length,
      total_realized_pnl: totalPnl,
      win_rate: Math.round((wins.length / groups.length) * 100),
      best_pnl_pct:  sorted[0]               ? { symbol: tickerFn(sorted[0]),               realized_pnl_pct: sorted[0][pctKey] ?? 0 }               : null,
      worst_pnl_pct: sorted[sorted.length-1] ? { symbol: tickerFn(sorted[sorted.length-1]), realized_pnl_pct: sorted[sorted.length-1][pctKey] ?? 0 } : null,
      avg_holding_period_days: Math.round(avgDays),
    };
  }, [tradeGroups, tradeHistory]);

  // current_price is now returned inline by GET /api/portfolio/closed-trades
  // (enriched server-side via the shared Tradier per-ticker cache, yfinance fallback for OTC)
  // No separate price fetch needed — avoids duplicate API calls for overlapping tickers.

  const [closedPanelOpen, setClosedPanelOpen] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('weight');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [portfolioChartInterval, setPortfolioChartInterval] = useState('D');
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStage, setAiStage] = useState('');
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesError, setQuotesError] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState('stock');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editShares, setEditShares] = useState('');
  const [editAvgCost, setEditAvgCost] = useState('');
  const [editEntryDate, setEditEntryDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [sellModal, setSellModal] = useState<{ id: string; ticker: string; shares: number; avgCost: number; currentPrice: number } | null>(null);
  const [sellType, setSellType] = useState<'shares' | 'dollars' | 'percent' | 'full'>('shares');
  const [sellShares, setSellShares] = useState('');
  const [sellDollars, setSellDollars] = useState('');
  const [sellPercent, setSellPercent] = useState('');
  const [sellExitPrice, setSellExitPrice] = useState('');
  const [sellExitDate, setSellExitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sellInProgress, setSellInProgress] = useState(false);
  const [sellError, setSellError] = useState('');
  const [editingClosedId, setEditingClosedId] = useState<string | null>(null);
  const [editClosedExitPrice, setEditClosedExitPrice] = useState('');
  const [editClosedExitDate, setEditClosedExitDate] = useState('');
  const [editClosedEntryDate, setEditClosedEntryDate] = useState('');
  const [savingClosedEdit, setSavingClosedEdit] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Buy lots state
  const [lotsData, setLotsData] = useState<Record<string, Lot[]>>({});
  const [buyFormTicker, setBuyFormTicker] = useState<string | null>(null);
  const [buyShares, setBuyShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [buyNotes, setBuyNotes] = useState('');
  const [addingBuy, setAddingBuy] = useState(false);
  const [buyError, setBuyError] = useState('');

  // Refetch by invalidating the shared query cache (used by both this page
  // and the parent caelyn-terminal page's dashboardHoldings query).
  const refetchHoldings = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['stock-holdings'] });
  }, [queryClient]);

  // Fetch lots from FastAPI when a card is expanded (lazy, cached per ticker)
  useEffect(() => {
    if (!expandedCard) return;
    const h = holdingsData?.find(h => h.id === expandedCard);
    if (!h) return;
    if (lotsData[h.ticker] !== undefined) return;
    fetch('/api/portfolio/holdings')
      .then(r => r.ok ? r.json() : null)
      .then((data: any) => {
        if (!data) return;
        const list: any[] = data.holdings ?? (Array.isArray(data) ? data : []);
        const match = list.find((x: any) => (x.ticker || '').toUpperCase() === h.ticker.toUpperCase());
        setLotsData(prev => ({ ...prev, [h.ticker]: match?.lots ?? [] }));
      })
      .catch(() => {});
  }, [expandedCard]);

  // Add a buy lot to an existing position via FastAPI /buy endpoint
  const addBuyLot = async (ticker: string) => {
    if (!buyShares || !buyPrice) { setBuyError('Shares and price are required.'); return; }
    setAddingBuy(true);
    setBuyError('');
    try {
      const res = await fetch(`/api/portfolio/holdings/${encodeURIComponent(ticker)}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shares: parseFloat(buyShares),
          price: parseFloat(buyPrice),
          ...(buyDate ? { date: buyDate } : {}),
          ...(buyNotes.trim() ? { notes: buyNotes.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.holding?.lots) {
          setLotsData(prev => ({ ...prev, [ticker]: data.holding.lots }));
        }
        queryClient.setQueryData<Holding[]>(['stock-holdings'], prev =>
          prev ? prev.map(h => h.ticker === ticker ? {
            ...h,
            shares: data.holding?.shares ?? h.shares,
            avgCost: data.holding?.avg_cost ?? h.avgCost,
            entry_date: data.holding?.entry_date ?? h.entry_date,
          } : h) : prev
        );
        setBuyShares('');
        setBuyPrice('');
        setBuyDate(new Date().toISOString().split('T')[0]);
        setBuyNotes('');
        setBuyFormTicker(null);
        syncToFastAPI();
      } else {
        setBuyError(data.detail || data.error || 'Failed to add buy lot.');
      }
    } catch (err: any) {
      setBuyError(err?.message || 'Network error.');
    } finally {
      setAddingBuy(false);
    }
  };

  // Fire-and-forget: push full updated holdings list to FastAPI/Neon after every CRUD op.
  // Reads from the shared React Query cache instead of hitting /api/stock-holdings again.
  const syncToFastAPI = useCallback(async () => {
    try {
      let allHoldings = queryClient.getQueryData<Holding[]>(['stock-holdings']);
      if (!Array.isArray(allHoldings) || allHoldings.length === 0) {
        const r = await fetch('/api/stock-holdings');
        if (!r.ok) return;
        allHoldings = await r.json().catch(() => []);
      }
      if (!Array.isArray(allHoldings) || allHoldings.length === 0) return;
      const syncRes = await fetch('/api/portfolio/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ holdings: allHoldings }),
      });
      const syncData = syncRes.ok ? await syncRes.json().catch(() => ({})) : {};
      console.log('[portfolio-sync-write]', JSON.stringify({
        dashboardCount:     allHoldings.length,
        dashboardSymbols:   allHoldings.map((h: any) => h.ticker).sort(),
        postStatus:         syncRes.status,
        afterBackendCount:  syncData.canonical_count ?? null,
        afterBackendSymbols: (syncData.canonical_symbols ?? []).sort(),
        success:            syncData.success === true || syncData.synced === true,
      }));
    } catch (err: any) {
      console.warn('[portfolio-sync-write] CRUD sync error:', err?.message);
    }
  }, [queryClient]);

  const fetchQuotes = useCallback(async (holdingsList: Holding[]) => {
    if (holdingsList.length === 0) return;
    setLoadingQuotes(true);
    setQuotesError(false);
    try {
      const tickers = holdingsList.map(h => h.ticker.toUpperCase());
      const assetTypes: Record<string, string> = {};
      holdingsList.forEach(h => { assetTypes[h.ticker.toUpperCase()] = (h.assetType || 'stock').toLowerCase(); });
      const res = await fetch(`/api/fmp/quotes?symbols=${tickers.join(',')}&asset_types=${encodeURIComponent(JSON.stringify(assetTypes))}`);
      if (res.ok) {
        const data: QuoteData[] = await res.json();
        console.log("[PORTFOLIO] Quotes response:", JSON.stringify(data));
        if (Array.isArray(data) && data.length > 0) {
          const map: Record<string, QuoteData> = {};
          data.forEach(q => {
            map[q.symbol] = q;
            map[q.symbol.toUpperCase()] = q;
          });
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

  useEffect(() => {
    if (holdings.length > 0) {
      fetchQuotes(holdings);
      fetchPriceTargets(holdings.map(h => h.ticker));
      fetchEvents(holdings.map(h => h.ticker));
    }
  }, [holdings, fetchQuotes, fetchPriceTargets, fetchEvents]);

  useEffect(() => {
    if (!closedTradesData) return;
    const trades = closedTradesData.closed_trades ?? [];
    console.log('[portfolio-history-ui]', JSON.stringify({
      source: 'GET /api/portfolio/closed-trades',
      tradeCount: trades.length,
      tickers: trades.map((t: any) => (t.symbol || t.ticker || '').toUpperCase()).filter(Boolean).sort(),
      hasSummary: tradeSummary != null,
      totalRealizedPnl: tradeSummary?.total_realized_pnl ?? null,
      bestTicker: tradeSummary?.best_pnl_pct?.symbol ?? null,
    }));
  }, [closedTradesData, tradeSummary]);

  const addHolding = async () => {
    if (!newTicker.trim() || !newShares || !newAvgCost) return;
    setAddingHolding(true);
    try {
      const res = await fetch('/api/stock-holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: newTicker.trim(), shares: parseFloat(newShares), avgCost: parseFloat(newAvgCost), assetType: selectedAssetType || 'stock', date_added: newDateAdded || new Date().toISOString() }),
      });
      if (res.ok) {
        setNewTicker('');
        setNewShares('');
        setNewAvgCost('');
        setNewDateAdded(new Date().toISOString().split('T')[0]);
        setSelectedAssetType('stock');
        await refetchHoldings();
        syncToFastAPI();
        queryClient.invalidateQueries({ queryKey: ['caelyn-terminal'] });
        // Invalidate Calendar Earnings for portfolio scope so next visit refetches
        queryClient.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('portfolio') });
        if (process.env.NODE_ENV !== 'production') console.log('[earnings-dynamic-sync]', { mutationType: 'portfolio-add', invalidatedKeys: ['earnings+portfolio'] });
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
      await refetchHoldings();
      syncToFastAPI();
      queryClient.invalidateQueries({ queryKey: ['caelyn-terminal'] });
      // Invalidate Calendar Earnings for portfolio scope so next visit refetches
      queryClient.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('portfolio') });
      if (process.env.NODE_ENV !== 'production') console.log('[earnings-dynamic-sync]', { mutationType: 'portfolio-delete', invalidatedKeys: ['earnings+portfolio'] });
    } catch (err) {
      console.error('Failed to delete holding:', err);
    }
  };

  const startEdit = (h: Holding, e: React.MouseEvent) => {
    e.stopPropagation();
    setSellModal(null);
    setEditingId(h.id);
    setEditShares(String(h.shares));
    setEditAvgCost(String(h.avgCost));
    const rawDate = h.entry_date || h.addedAt || '';
    setEditEntryDate(rawDate ? rawDate.split('T')[0] : '');
    setExpandedCard(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditShares('');
    setEditAvgCost('');
    setEditEntryDate('');
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingId || !editShares || !editAvgCost) return;
    setSavingEdit(true);
    const holding = holdings.find(h => h.id === editingId);
    try {
      await fetch(`/api/stock-holdings/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shares: parseFloat(editShares), avgCost: parseFloat(editAvgCost) }),
      });
      if (holding && editEntryDate) {
        fetch(`/api/portfolio/holdings/${encodeURIComponent(holding.ticker)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry_date: editEntryDate }),
        }).catch(() => {});
      }
      setEditingId(null);
      setEditShares('');
      setEditAvgCost('');
      setEditEntryDate('');
      await refetchHoldings();
      syncToFastAPI();
      queryClient.invalidateQueries({ queryKey: ['caelyn-terminal'] });
      queryClient.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('portfolio') });
      if (process.env.NODE_ENV !== 'production') console.log('[earnings-dynamic-sync]', { mutationType: 'portfolio-edit', invalidatedKeys: ['earnings+portfolio'] });
    } catch (err) {
      console.error('Failed to update holding:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const openSellModal = (h: any) => {
    setEditingId(null);
    setSellType('shares');
    setSellShares('');
    setSellDollars('');
    setSellPercent('');
    setSellError('');
    const price = h.currentPrice > 0 ? parseFloat(h.currentPrice.toFixed(4)) : 0;
    setSellExitPrice(price > 0 ? String(price) : '');
    setSellExitDate(new Date().toISOString().split('T')[0]);
    setSellModal({ id: h.id, ticker: h.ticker, shares: h.shares, avgCost: h.avgCost, currentPrice: price });
  };

  const closeSellModal = () => {
    setSellModal(null);
    setSellError('');
  };

  const confirmSell = async () => {
    if (!sellModal || !sellExitPrice) { setSellError('Exit price is required.'); return; }
    const exitPrice = parseFloat(sellExitPrice);
    if (!exitPrice || exitPrice <= 0) { setSellError('Enter a valid exit price.'); return; }

    const payload: any = { sell_type: sellType, exit_price: exitPrice, exit_date: sellExitDate };
    if (sellType === 'shares') {
      const s = parseFloat(sellShares);
      if (!s || s <= 0) { setSellError('Enter shares to sell.'); return; }
      payload.shares_sold = s;
    } else if (sellType === 'dollars') {
      const d = parseFloat(sellDollars);
      if (!d || d <= 0) { setSellError('Enter dollar amount.'); return; }
      payload.dollar_amount = d;
    } else if (sellType === 'percent') {
      const p = parseFloat(sellPercent);
      if (!p || p <= 0 || p > 100) { setSellError('Enter a percent between 1–100.'); return; }
      payload.percent_sold = p;
    }

    setSellInProgress(true);
    setSellError('');
    try {
      const res = await fetch(`/api/portfolio/holdings/${encodeURIComponent(sellModal.ticker)}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSellError(data?.detail ?? data?.error ?? `Error ${res.status}`);
        return;
      }

      console.log('[portfolio-sell-ui]', JSON.stringify({
        ticker:             sellModal.ticker,
        sellType:           sellType,
        sharesBefore:       data.shares_before ?? sellModal.shares,
        sharesSold:         data.shares_sold,
        sharesRemaining:    data.shares_remaining,
        exitPrice:          exitPrice,
        exitDate:           sellExitDate,
        backendRealizedPnl:    data.realized_pnl,
        backendRealizedPnlPct: data.realized_pnl_pct,
        closedTradeId:      data.closed_trade?.id ?? null,
        refetchedActive:    true,
        refetchedClosed:    true,
        refetchedTerminal:  true,
      }));

      const isFullClose = data.shares_remaining === 0 || data.active_holding === null;

      // Optimistically update React Query cache immediately from backend response
      // so the UI reflects the change even before the local JSON is updated
      queryClient.setQueryData<Holding[]>(['stock-holdings'], (prev) => {
        if (!Array.isArray(prev)) return prev;
        if (isFullClose) {
          return prev.filter(h => h.id !== sellModal.id);
        } else {
          return prev.map(h => h.id === sellModal.id ? { ...h, shares: data.shares_remaining } : h);
        }
      });

      // Update local JSON storage (best-effort; cache already updated above)
      if (isFullClose) {
        await fetch(`/api/stock-holdings/${sellModal.id}`, { method: 'DELETE' })
          .catch(err => console.warn('[sell] local DELETE failed (non-blocking):', err?.message));
      } else if (data.shares_remaining > 0) {
        await fetch(`/api/stock-holdings/${sellModal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shares: data.shares_remaining, avgCost: sellModal.avgCost }),
        }).catch(err => console.warn('[sell] local PUT failed (non-blocking):', err?.message));
      }

      closeSellModal();
      await refetchHoldings();
      await refetchClosedTrades();
      syncToFastAPI();
      queryClient.invalidateQueries({ queryKey: ['caelyn-terminal'] });
      queryClient.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('portfolio') });
    } catch (err: any) {
      setSellError(err?.message ?? 'Unexpected error');
    } finally {
      setSellInProgress(false);
    }
  };

  const startClosedEdit = (t: any, tradeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClosedId(tradeId);
    setEditClosedExitPrice(String(t.exit_price ?? ''));
    const rawExit = t.exit_date || '';
    setEditClosedExitDate(rawExit ? rawExit.split('T')[0] : '');
    const rawEntry = t.entry_date || t.open_date || '';
    setEditClosedEntryDate(rawEntry ? rawEntry.split('T')[0] : '');
  };

  const cancelClosedEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClosedId(null);
    setEditClosedExitPrice('');
    setEditClosedExitDate('');
    setEditClosedEntryDate('');
  };

  const saveClosedEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingClosedId) return;
    setSavingClosedEdit(true);
    try {
      await fetch(`/api/portfolio/closed-trades/${encodeURIComponent(editingClosedId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exit_price: editClosedExitPrice ? parseFloat(editClosedExitPrice) : undefined,
          exit_date: editClosedExitDate || undefined,
          entry_date: editClosedEntryDate || undefined,
        }),
      });
      setEditingClosedId(null);
      setEditClosedExitPrice('');
      setEditClosedExitDate('');
      setEditClosedEntryDate('');
      await refetchClosedTrades();
    } catch (err) {
      console.error('Failed to update closed trade:', err);
    } finally {
      setSavingClosedEdit(false);
    }
  };

  const deleteClosedTrade = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/portfolio/closed-trades/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refetchClosedTrades();
    } catch (err) {
      console.error('Failed to delete closed trade:', err);
    }
  };

  // Realtime hydration for equity/ETF holdings (skip crypto/commodities — different feeds).
  const equitySymbols = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const h of holdings) {
      const t = (h.assetType || 'stock').toLowerCase();
      if (t !== 'stock' && t !== 'etf' && t !== 'index' && t !== 'indices') continue;
      const sym = h.ticker?.toUpperCase();
      if (!sym || seen.has(sym)) continue;
      seen.add(sym);
      out.push(sym);
    }
    return out;
  }, [holdings.map(h => `${h.ticker}:${h.assetType || 'stock'}`).join('|')]);
  const { quotesBySymbol: realtimeQuotes } = useRealtimeQuotes(equitySymbols, { enabled: equitySymbols.length > 0 });

  const enrichedHoldings = useMemo(() => {
    return holdings.map(h => {
      const q = quotes[h.ticker] || quotes[h.ticker.toUpperCase()];
      const rt = realtimeQuotes[h.ticker?.toUpperCase()];

      // Prefer realtime price/change when available; fallback to FMP quote.
      const rtPrice = typeof rt?.price === 'number' && Number.isFinite(rt.price) ? rt.price
        : typeof rt?.last === 'number' && Number.isFinite(rt.last) ? rt.last
        : null;
      const rtChange = typeof rt?.change === 'number' && Number.isFinite(rt.change) ? rt.change : null;

      const currentPrice = rtPrice != null ? rtPrice : (q?.price || 0);
      const dailyChange = rtChange != null ? rtChange : (q?.change || 0);
      const dailyPL = dailyChange * h.shares;
      const totalPL = (currentPrice - h.avgCost) * h.shares;
      const totalValue = currentPrice * h.shares;
      return {
        ...h,
        currentPrice,
        dailyChange,
        dailyPL,
        totalPL,
        totalValue,
        quote: q,
        priceMeta: rt
          ? {
              source: rt.source,
              is_realtime: rt.is_realtime,
              is_live_backup: rt.is_live_backup,
              is_stale: rt.is_stale,
              staleness_seconds: rt.staleness_seconds,
              quote_timestamp: rt.quote_timestamp,
              updated_at: rt.updated_at,
            }
          : null,
      };
    });
  }, [holdings, quotes, realtimeQuotes]);

  const totalPortfolioValue = useMemo(() => enrichedHoldings.reduce((sum, h) => sum + h.totalValue, 0), [enrichedHoldings]);
  const totalDailyPL = useMemo(() => enrichedHoldings.reduce((sum, h) => sum + h.dailyPL, 0), [enrichedHoldings]);
  const totalOverallPL = useMemo(() => enrichedHoldings.reduce((sum, h) => sum + h.totalPL, 0), [enrichedHoldings]);
  const totalCostBasis = useMemo(() => enrichedHoldings.reduce((sum, h) => sum + (h.avgCost * h.shares), 0), [enrichedHoldings]);

  useSetPageContext((() => {
    const parts = ['[Page: Stocks Portfolio — Personal Holdings Tracker]'];
    if (enrichedHoldings.length) {
      const tickers = enrichedHoldings.slice(0, 20).map(h => h.ticker).join(', ');
      parts.push(`Holdings: ${tickers}`);
      parts.push(`Total value: $${totalPortfolioValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
      parts.push(`Daily P&L: ${totalDailyPL >= 0 ? '+' : ''}$${totalDailyPL.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    } else {
      parts.push('No holdings loaded yet.');
    }
    parts.push('Use for portfolio review, position sizing, P&L analysis, risk exposure, and holding-level insights.');
    return parts.join('\n');
  })(), [enrichedHoldings, totalPortfolioValue, totalDailyPL]);

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

  const ASSET_COLORS: Record<string, string> = { Stocks: '#10b981', ETFs: '#3b82f6', Crypto: '#f59e0b', Commodities: '#ef4444' };
  const sectorData = useMemo(() => {
    const cats: Record<string, number> = {};
    enrichedHoldings.forEach(h => {
      const t = (h.assetType || 'stock').toLowerCase();
      let cat = 'Stocks';
      if (t === 'etf' || t === 'index' || t === 'indices') cat = 'ETFs';
      else if (t === 'crypto' || t === 'cryptocurrency') cat = 'Crypto';
      else if (t === 'commodity' || t === 'commodities') cat = 'Commodities';
      cats[cat] = (cats[cat] || 0) + h.totalValue;
    });
    return Object.entries(cats)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, pct: totalPortfolioValue > 0 ? ((value / totalPortfolioValue) * 100).toFixed(1) : '0', color: ASSET_COLORS[name] || '#64748b' }))
      .sort((a, b) => b.value - a.value);
  }, [enrichedHoldings, totalPortfolioValue]);

  useSetScreenContext((() => ({
    route: '/app/stocks/portfolio',
    page: 'portfolio',
    sort: { key: sortKey, dir: sortAsc ? 'asc' : 'desc' },
    row_count: sortedHoldings.length,
    visible_rows: sortedHoldings.slice(0, 30).map(h => ({
      ticker: h.ticker,
      asset_type: h.assetType ?? null,
      shares: h.shares,
      avg_cost: h.avgCost,
      current_price: h.currentPrice,
      total_value: parseFloat(h.totalValue.toFixed(2)),
      weight_pct: totalPortfolioValue > 0 ? parseFloat(((h.totalValue / totalPortfolioValue) * 100).toFixed(1)) : null,
      daily_pl: parseFloat(h.dailyPL.toFixed(2)),
      total_pl: parseFloat(h.totalPL.toFixed(2)),
      total_pl_pct: h.avgCost > 0 ? parseFloat(((h.totalPL / (h.avgCost * h.shares)) * 100).toFixed(1)) : null,
      change_1d_pct: (h as any).quote?.change_pct ?? (h as any).quote?.regularMarketChangePercent ?? null,
    })),
    extra: {
      total_value: totalPortfolioValue,
      total_daily_pl: totalDailyPL,
      total_overall_pl: totalOverallPL,
      total_cost_basis: totalCostBasis,
      asset_breakdown: sectorData,
    },
    freshness: new Date().toISOString(),
  }))(), [sortedHoldings, sortKey, sortAsc, totalPortfolioValue, totalDailyPL, totalOverallPL, totalCostBasis, sectorData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const plBarData = useMemo(() => {
    return [...enrichedHoldings]
      .sort((a, b) => Math.abs(b.dailyPL) - Math.abs(a.dailyPL))
      .map(h => ({ ticker: h.ticker, dailyPL: parseFloat(h.dailyPL.toFixed(2)), fill: h.dailyPL >= 0 ? '#22c55e' : '#ef4444' }));
  }, [enrichedHoldings]);

  const runAIReview = async () => {
    if (holdings.length === 0) return;
    setAiLoading(true);
    setAiReview(null);
    const stages = ['Analyzing portfolio...', 'Pulling price data...', 'Scanning technicals...', 'Checking fundamentals...', 'Reading sentiment...', 'Building portfolio view...', 'Generating ratings...', 'Almost done — this can take up to 30 seconds...'];
    let idx = 0;
    setAiStage(stages[0]);
    const iv = setInterval(() => { idx++; if (idx < stages.length) setAiStage(stages[idx]); }, 2000);
    try {
      const holdingsPayload = holdings.map(h => ({
        ticker: h.ticker,
        shares: h.shares,
        avg_cost: h.avgCost,
      }));
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      const res = await fetch('/api/portfolio-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: holdingsPayload }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Server returned ${res.status}${errText ? ': ' + errText : ''}`);
      }
      const data = await res.json();
      const analysisText = data.message || data.text || data.analysis || 'No analysis returned.';
      setAiReview(analysisText);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAiReview('Portfolio review timed out. The analysis is taking longer than expected — please try again.');
      } else {
        setAiReview(`Failed to get portfolio review. Please try again. (${err.message})`);
      }
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

  interface ParsedPosition {
    ticker: string;
    weight: string;
    pnl: string;
    verdict: string;
    thesis: string;
    keyRisk: string;
    catalyst: string;
    positionSize: string;
    extra: string[];
  }

  interface ParsedReview {
    positions: ParsedPosition[];
    overallAssessment: string;
    grade: string;
    actionItems: string[];
    newPosition: string;
    otherSections: { title: string; body: string }[];
  }

  function parsePortfolioReview(message: string): ParsedReview | null {
    try {
      const sections: ParsedReview = { positions: [], overallAssessment: '', grade: '', actionItems: [], newPosition: '', otherSections: [] };
      const parts = message.split(/^## /gm).filter(Boolean);
      if (parts.length < 2) return null;

      for (const part of parts) {
        if (/^INDIVIDUAL\s*POSITIONS?/i.test(part)) {
          const positionBlocks = part.split(/^### /gm).filter(Boolean).slice(1);
          for (const block of positionBlocks) {
            const lines = block.trim().split('\n').filter(l => l.trim());
            const headerLine = lines[0].replace(/\*\*/g, '');
            const headerMatch = headerLine.match(/([A-Z0-9.]+)\s*\((.+?)\)\s*[-–—]\s*(.+)/);
            const position: ParsedPosition = {
              ticker: headerMatch ? headerMatch[1] : headerLine.split(/\s/)[0],
              weight: headerMatch ? headerMatch[2].trim() : '',
              pnl: headerMatch ? headerMatch[3].trim() : '',
              verdict: '',
              thesis: '',
              keyRisk: '',
              catalyst: '',
              positionSize: '',
              extra: [],
            };

            for (const line of lines.slice(1)) {
              const clean = line.replace(/\*\*/g, '').trim();
              if (/^VERDICT:/i.test(clean)) position.verdict = clean.replace(/^VERDICT:\s*/i, '');
              else if (/^THESIS:/i.test(clean)) position.thesis = clean.replace(/^THESIS:\s*/i, '');
              else if (/^KEY RISK:/i.test(clean)) position.keyRisk = clean.replace(/^KEY RISK:\s*/i, '');
              else if (/^CATALYST:/i.test(clean)) position.catalyst = clean.replace(/^CATALYST:\s*/i, '');
              else if (/^POSITION SIZE:/i.test(clean)) position.positionSize = clean.replace(/^POSITION SIZE:\s*/i, '');
              else if (clean) position.extra.push(clean);
            }
            sections.positions.push(position);
          }
        } else if (/^OVERALL/i.test(part)) {
          sections.overallAssessment = part.replace(/^OVERALL\s*ASSESSMENT\s*/i, '').trim();
          const gradeMatch = part.match(/PORTFOLIO GRADE:\s*([A-F][+-]?)/i);
          if (gradeMatch) sections.grade = gradeMatch[1];
        } else if (/ACTION\s*ITEM/i.test(part)) {
          sections.actionItems = part.split('\n').filter(l => l.trim() && !/^#|^ACTION\s*ITEM/i.test(l.trim())).map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/\*\*/g, '').trim());
        } else if (/NEW\s*POSITION|ADD.*POSITION|SUGGESTED.*ADDITION/i.test(part)) {
          sections.newPosition = part.replace(/^.*?\n/, '').trim();
        } else {
          const titleEnd = part.indexOf('\n');
          if (titleEnd > 0) {
            sections.otherSections.push({ title: part.slice(0, titleEnd).trim(), body: part.slice(titleEnd).trim() });
          }
        }
      }

      return sections.positions.length > 0 ? sections : null;
    } catch {
      return null;
    }
  }

  function getVerdictStyle(verdict: string) {
    const v = verdict.toUpperCase();
    if (v.includes('BUY MORE') || v.includes('STRONG BUY') || v === 'BUY') return { bg: '#059669', text: '#fff' };
    if (v.includes('HOLD')) return { bg: '#475569', text: '#fff' };
    if (v.includes('TRIM')) return { bg: '#d97706', text: '#000' };
    if (v.includes('SELL')) return { bg: '#dc2626', text: '#fff' };
    return { bg: '#475569', text: '#fff' };
  }

  function getGradeColor(grade: string) {
    const g = grade.charAt(0).toUpperCase();
    if (g === 'A') return '#34d399';
    if (g === 'B') return '#60a5fa';
    if (g === 'C') return '#fbbf24';
    if (g === 'D') return '#fb923c';
    if (g === 'F') return '#f87171';
    return '#94a3b8';
  }

  function pnlIsPositive(pnl: string) {
    return pnl.startsWith('+') || (!pnl.startsWith('-') && !pnl.includes('loss'));
  }

  function renderStyledReview(review: ParsedReview): ReactNode {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {review.positions.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Individual Positions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
              {review.positions.map((pos, i) => {
                const vs = getVerdictStyle(pos.verdict);
                const pnlPositive = pnlIsPositive(pos.pnl);
                return (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>{pos.ticker}</span>
                        {pos.weight && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{pos.weight}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {pos.pnl && <span style={{ fontSize: 12, fontWeight: 600, color: pnlPositive ? '#34d399' : '#f87171' }}>{pos.pnl}</span>}
                        {pos.verdict && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: vs.bg, color: vs.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{pos.verdict}</span>}
                      </div>
                    </div>
                    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pos.thesis && (
                        <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{pos.thesis}</div>
                      )}
                      {pos.keyRisk && (
                        <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: 10, fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700, fontSize: 10, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Risk: </span>{pos.keyRisk}
                        </div>
                      )}
                      {pos.catalyst && (
                        <div style={{ borderLeft: '3px solid #10b981', paddingLeft: 10, fontSize: 12, color: '#6ee7b7', lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700, fontSize: 10, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Catalyst: </span>{pos.catalyst}
                        </div>
                      )}
                      {pos.positionSize && (
                        <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: 10, fontSize: 12, color: '#93c5fd', lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700, fontSize: 10, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Size: </span>{pos.positionSize}
                        </div>
                      )}
                      {pos.extra.length > 0 && pos.extra.map((e, j) => (
                        <div key={j} style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{e}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {review.overallAssessment && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall Assessment</span>
              {review.grade && (
                <span style={{ fontSize: 22, fontWeight: 900, color: getGradeColor(review.grade), textShadow: `0 0 20px ${getGradeColor(review.grade)}40` }}>{review.grade}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {review.overallAssessment.split('\n').filter(l => l.trim()).map((line, i) => {
                const clean = line.replace(/\*\*/g, '');
                const isGrade = /PORTFOLIO GRADE:/i.test(clean);
                if (isGrade) return null;
                const isBullet = /^[-•*]/.test(clean.trim());
                return (
                  <div key={i} style={{ padding: isBullet ? '3px 0 3px 8px' : '3px 0', borderLeft: isBullet ? '2px solid #3b82f640' : 'none', marginBottom: 2, marginLeft: isBullet ? 4 : 0 }}>
                    {clean.replace(/^[-•*]\s*/, '')}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {review.actionItems.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Action Items</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {review.actionItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', minWidth: 20, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {review.newPosition && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Suggested New Position</div>
            <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{review.newPosition.replace(/\*\*/g, '')}</div>
          </div>
        )}

        {review.otherSections.map((sec, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{sec.title}</div>
            <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{sec.body.replace(/\*\*/g, '')}</div>
          </div>
        ))}
      </div>
    );
  }

  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const openInNewTab = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="min-h-screen text-white portfolio-page" style={{ background: '#050608' }}>
      <style>{`
        .portfolio-page::-webkit-scrollbar { width: 6px; }
        .portfolio-page::-webkit-scrollbar-track { background: #050608; }
        .portfolio-page::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }
        .portfolio-page::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
      `}</style>

      {/* ── Sell / Trim Position Modal ────────────────────────────────── */}
      {sellModal && (() => {
        const m = sellModal;
        const exitP = parseFloat(sellExitPrice) || 0;
        let estSharesSold = 0;
        if (sellType === 'shares')  estSharesSold = Math.min(parseFloat(sellShares) || 0, m.shares);
        if (sellType === 'dollars') estSharesSold = exitP > 0 ? Math.min((parseFloat(sellDollars) || 0) / exitP, m.shares) : 0;
        if (sellType === 'percent') estSharesSold = m.shares * ((parseFloat(sellPercent) || 0) / 100);
        if (sellType === 'full')    estSharesSold = m.shares;
        const estProceeds  = estSharesSold * exitP;
        const estCostBasis = estSharesSold * m.avgCost;
        const estPnl       = estProceeds - estCostBasis;
        const estPnlPct    = estCostBasis > 0 ? (estPnl / estCostBasis) * 100 : 0;
        const estRemaining = Math.max(0, m.shares - estSharesSold);
        const hasPreview   = estSharesSold > 0 && exitP > 0;

        const inputCls = "w-full bg-transparent border-b text-white text-sm px-1 py-1 focus:outline-none transition-colors";
        const borderColor = "border-slate-600 focus:border-sky-400";

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(5,6,8,0.82)', backdropFilter: 'blur(6px)' }}
            onClick={closeSellModal}
          >
            <div
              className="w-full max-w-md rounded-xl flex flex-col"
              style={{ background: '#0d1623', border: '1px solid #1a2540', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #1a2540' }}>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#ef4444' }}>Sell / Trim Position</div>
                  <div className="text-lg font-bold text-white">{m.ticker}</div>
                </div>
                <button onClick={closeSellModal} className="p-1.5 rounded hover:bg-white/5 transition-colors" style={{ color: '#64748b' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Holding summary strip */}
              <div className="flex gap-4 px-5 py-3 text-xs" style={{ borderBottom: '1px solid #1a2540', background: 'rgba(255,255,255,0.02)' }}>
                <div><span style={{ color: '#64748b' }}>Shares: </span><span className="font-semibold text-white">{m.shares.toLocaleString(undefined,{maximumFractionDigits:4})}</span></div>
                <div><span style={{ color: '#64748b' }}>Avg Cost: </span><span className="font-semibold text-white">${m.avgCost.toFixed(4)}</span></div>
                {m.currentPrice > 0 && <div><span style={{ color: '#64748b' }}>Last: </span><span className="font-semibold" style={{ color: m.currentPrice >= m.avgCost ? '#1fd073' : '#f04d4d' }}>${m.currentPrice.toFixed(4)}</span></div>}
              </div>

              {/* Body */}
              <div className="px-5 py-4 flex flex-col gap-4">

                {/* Sell type tabs */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>Sell Type</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['shares','dollars','percent','full'] as const).map(t => {
                      const labels: Record<string,string> = { shares: 'By Shares', dollars: 'By $', percent: 'By %', full: 'Full Close' };
                      const active = sellType === t;
                      return (
                        <button
                          key={t}
                          onClick={() => { setSellType(t); setSellError(''); }}
                          className="py-1.5 rounded text-xs font-semibold transition-all"
                          style={{
                            background: active ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                            color: active ? '#f87171' : '#94a3b8',
                            border: `1px solid ${active ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >{labels[t]}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount input */}
                {sellType !== 'full' && (
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#64748b' }}>
                      {sellType === 'shares' ? 'Shares to sell' : sellType === 'dollars' ? 'Dollar amount ($)' : 'Percent to sell (%)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={sellType === 'percent' ? 100 : undefined}
                      step={sellType === 'shares' ? 'any' : '0.01'}
                      value={sellType === 'shares' ? sellShares : sellType === 'dollars' ? sellDollars : sellPercent}
                      onChange={e => {
                        setSellError('');
                        if (sellType === 'shares')  setSellShares(e.target.value);
                        if (sellType === 'dollars') setSellDollars(e.target.value);
                        if (sellType === 'percent') setSellPercent(e.target.value);
                      }}
                      placeholder={sellType === 'shares' ? `Max ${m.shares}` : sellType === 'dollars' ? '500.00' : '25'}
                      className={`${inputCls} ${borderColor}`}
                    />
                    {sellType === 'percent' && parseFloat(sellPercent) > 0 && parseFloat(sellPercent) <= 100 && (
                      <div className="text-[10px] mt-1" style={{ color: '#64748b' }}>
                        ≈ {(m.shares * parseFloat(sellPercent) / 100).toFixed(4)} shares
                      </div>
                    )}
                  </div>
                )}

                {/* Exit price + date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#64748b' }}>Exit Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={sellExitPrice}
                      onChange={e => { setSellError(''); setSellExitPrice(e.target.value); }}
                      placeholder="0.00"
                      className={`${inputCls} ${borderColor}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#64748b' }}>Exit Date</label>
                    <input
                      type="date"
                      value={sellExitDate}
                      onChange={e => setSellExitDate(e.target.value)}
                      className={`${inputCls} ${borderColor}`}
                      style={{ colorScheme: 'dark' as any }}
                    />
                  </div>
                </div>

                {/* Preview */}
                {hasPreview && (
                  <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1a2540' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#64748b' }}>Estimated Preview</div>
                    <div className="grid grid-cols-2 gap-y-1.5">
                      <div style={{ color: '#94a3b8' }}>Shares Sold</div>
                      <div className="text-right font-semibold text-white">{estSharesSold.toFixed(4)}</div>
                      <div style={{ color: '#94a3b8' }}>Proceeds</div>
                      <div className="text-right font-semibold text-white">${estProceeds.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      <div style={{ color: '#94a3b8' }}>Remaining Shares</div>
                      <div className="text-right font-semibold text-white">{estRemaining.toFixed(4)}</div>
                      <div style={{ color: '#94a3b8' }}>Realized P&L</div>
                      <div className="text-right font-semibold" style={{ color: estPnl >= 0 ? '#1fd073' : '#f04d4d' }}>
                        {estPnl >= 0 ? '+' : ''}${estPnl.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                        <span className="ml-1.5 text-[10px]">({estPnlPct >= 0 ? '+' : ''}{estPnlPct.toFixed(2)}%)</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px]" style={{ color: '#475569' }}>Backend is source of truth — preview is estimated.</div>
                  </div>
                )}

                {/* Error */}
                {sellError && (
                  <div className="text-xs px-3 py-2 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                    {sellError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-5 pb-5">
                <button
                  onClick={closeSellModal}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSell}
                  disabled={sellInProgress}
                  className="flex-1 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}
                >
                  {sellInProgress ? 'Processing…' : sellType === 'full' ? 'Close Full Position' : 'Confirm Sell'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ─────────────────────────────────────────────────────────────── */}

      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-4 lg:space-y-6">

          {/* AI Review Result */}
          {aiReview && (() => {
            const parsed = parsePortfolioReview(aiReview);
            return (
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "20px",
                marginTop: "16px",
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}>
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-semibold text-white">AI Portfolio Analysis</h3>
                  <button onClick={() => setAiReview(null)} className="ml-auto text-crypto-silver hover:text-white text-xs">Dismiss</button>
                </div>
                {parsed ? renderStyledReview(parsed) : (
                  <div style={{ lineHeight: 1.7, fontSize: 14, color: '#ccc', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: formatAnalysis(aiReview) }} />
                )}
              </div>
            );
          })()}

          {/* Section 1: Portfolio Input */}
          <GlassCard className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-center">
              <div className="flex items-center gap-1.5 flex-shrink-0 mr-3">
                <Plus className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-white whitespace-nowrap">Add Position</span>
              </div>
              <input type="text" placeholder="Ticker (e.g. NVDA)" value={newTicker} onChange={e => setNewTicker(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && addHolding()} className="rounded-lg px-3 py-2 text-sm text-white placeholder-crypto-silver/50 focus:outline-none focus:border-cyan-500/50 w-full sm:w-36" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} />
              <select value={selectedAssetType} onChange={e => setSelectedAssetType(e.target.value)} className="rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 w-full sm:w-32 appearance-none cursor-pointer" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                <option value="stock" style={{ background: 'rgba(255,255,255,0.02)' }}>Stock</option>
                <option value="etf" style={{ background: 'rgba(255,255,255,0.02)' }}>ETF</option>
                <option value="crypto" style={{ background: 'rgba(255,255,255,0.02)' }}>Crypto</option>
                <option value="commodity" style={{ background: 'rgba(255,255,255,0.02)' }}>Commodity</option>
              </select>
              <input type="number" placeholder={SHARES_LABEL[selectedAssetType] || 'Shares'} value={newShares} onChange={e => setNewShares(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHolding()} className="rounded-lg px-3 py-2 text-sm text-white placeholder-crypto-silver/50 focus:outline-none focus:border-cyan-500/50 w-full sm:w-28" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} />
              <input type="number" placeholder="Avg Price ($)" value={newAvgCost} onChange={e => setNewAvgCost(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHolding()} className="rounded-lg px-3 py-2 text-sm text-white placeholder-crypto-silver/50 focus:outline-none focus:border-cyan-500/50 w-full sm:w-32" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} />
              <input type="date" value={newDateAdded} onChange={e => setNewDateAdded(e.target.value)} className="rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 w-full sm:w-36" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', colorScheme: 'dark' as any }} title="Date Added (entry date)" />
              <button onClick={addHolding} disabled={addingHolding || !newTicker.trim() || !newShares || !newAvgCost} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #2090d0, #5cc8f0)', boxShadow: '0 0 12px rgba(32, 144, 208, 0.3)' }}>
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {newTicker.trim() && INDEX_TO_ETF[newTicker.trim()] && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                <span className="text-blue-300">
                  {newTicker.trim() === 'VIX'
                    ? <>VIX index data is available but limited. For active trading, consider <strong>{INDEX_TO_ETF[newTicker.trim()].etf}</strong> ({INDEX_TO_ETF[newTicker.trim()].name}) which has full price tracking and charts.</>
                    : <><strong>{newTicker.trim()}</strong> is an index and can't be directly traded. Consider adding <strong>{INDEX_TO_ETF[newTicker.trim()].etf}</strong> ({INDEX_TO_ETF[newTicker.trim()].name}) instead for accurate price tracking.</>
                  }
                </span>
                <button
                  onClick={() => { setNewTicker(INDEX_TO_ETF[newTicker.trim()].etf); setSelectedAssetType('etf'); }}
                  className="ml-auto flex-shrink-0 px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-blue-200 font-medium transition-all"
                >
                  Use {INDEX_TO_ETF[newTicker.trim()].etf}
                </button>
              </div>
            )}
          </GlassCard>

          {/* Holdings Table */}
          {holdings.length > 0 && (
            <GlassCard className="p-3 sm:p-4">
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <table className="w-full text-sm">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#08090e' }}>
                      <th className="pb-2 pr-1 w-6"></th>
                      <th className="text-left pb-2 pl-1 pr-4 min-w-[110px]"><SortHeader label="Ticker" keyName="ticker" /></th>
                      <th className="text-right pb-2 px-3 min-w-[60px]"><SortHeader label="Shares" keyName="shares" /></th>
                      <th className="text-right pb-2 px-3 min-w-[80px]"><SortHeader label="Avg Price" keyName="avgCost" /></th>
                      <th className="text-right pb-2 px-3 min-w-[80px]"><SortHeader label="Price" keyName="currentPrice" /></th>
                      <th className="text-right pb-2 px-3 min-w-[80px]" style={{color:'#94a3b8',fontSize:11}}>Invested</th>
                      <th className="text-right pb-2 px-3 min-w-[80px]" style={{color:'#94a3b8',fontSize:11}}>Value</th>
                      <th className="text-right pb-2 px-3 min-w-[80px]"><SortHeader label="Daily P&L" keyName="dailyPL" /></th>
                      <th className="text-right pb-2 px-3 min-w-[80px]"><SortHeader label="Total P&L" keyName="totalPL" /></th>
                      <th className="text-right pb-2 px-3 min-w-[60px]"><SortHeader label="Weight%" keyName="weight" /></th>
                      <th className="text-right pb-2 pl-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHoldings.map(h => {
                      const isExpanded = expandedCard === h.id;
                      const target = priceTargets[h.ticker];
                      const q = h.quote;
                      return (
                        <Fragment key={h.id}>
                          {(() => {
                            const isEditing = editingId === h.id;
                            const editedShares = parseFloat(editShares) || 0;
                            const editedAvgCost = parseFloat(editAvgCost) || 0;
                            const editedInvested = editedShares * editedAvgCost;
                            const inputCls = "w-full bg-transparent text-right text-white text-sm border-b border-[#5cc8f0]/60 focus:border-[#5cc8f0] focus:outline-none py-0.5 px-1";
                            return (
                              <tr
                                onClick={() => !isEditing && setExpandedCard(isExpanded ? null : h.id)}
                                className="transition-colors"
                                style={{ borderBottom: '1px solid #1a1c3a', cursor: isEditing ? 'default' : 'pointer', background: isEditing ? 'rgba(92,200,240,0.04)' : 'transparent' }}
                                onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = 'rgba(32, 144, 208, 0.06)'; }}
                                onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = 'transparent'; }}
                              >
                                <td className="py-2.5 pr-1 w-6">
                                  {!isEditing && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color: '#5cc8f0' }} /> : <ChevronRight className="w-3.5 h-3.5 text-crypto-silver hover:text-[#5cc8f0]" />)}
                                </td>
                                <td className="py-2.5 pr-3">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 24, height: 24, borderRadius: 5, background: '#ffffff14', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                      <img
                                        src={`https://images.financialmodelingprep.com/symbol/${h.ticker.toUpperCase()}.png`}
                                        alt=""
                                        loading="lazy"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        onError={(e) => { const el = e.currentTarget as HTMLImageElement; el.style.display = 'none'; (el.parentElement as HTMLElement).style.background = 'transparent'; }}
                                      />
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1rem' }}>{h.ticker}</span>
                                        {lotsData[h.ticker]?.length > 1 && (
                                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(92,200,240,0.12)', color: '#5cc8f0', border: '1px solid rgba(92,200,240,0.2)', whiteSpace: 'nowrap' }}>
                                            {lotsData[h.ticker].length} buys
                                          </span>
                                        )}
                                      </div>
                                      {isEditing ? (
                                        <input
                                          type="date"
                                          value={editEntryDate}
                                          onChange={e => setEditEntryDate(e.target.value)}
                                          onClick={e => e.stopPropagation()}
                                          title="Entry date"
                                          className="bg-transparent border-b border-[#5cc8f0]/40 text-[10px] text-[#5cc8f0] focus:outline-none focus:border-[#5cc8f0] px-0 py-0 w-[90px]"
                                          style={{ colorScheme: 'dark' as any }}
                                        />
                                      ) : (
                                        <div className="truncate max-w-[120px]" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                          {getDisplayName(h.ticker, h.assetType, h.quote?.companyName || h.quote?.name)}
                                          {!h.entry_date && !h.addedAt && (
                                            <span title="Entry date missing — click Pencil to set" style={{ marginLeft: 4, color: '#e8a020', fontSize: '0.65rem' }}>⚠ no date</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {/* Shares — editable */}
                                <td className="text-right py-2.5 px-3">
                                  {isEditing
                                    ? <input type="number" value={editShares} onChange={e => setEditShares(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') saveEdit(e as any); if (e.key === 'Escape') cancelEdit(e as any); }} className={inputCls} style={{ width: 72 }} autoFocus />
                                    : <span className="text-crypto-silver">{h.shares}</span>
                                  }
                                </td>
                                {/* Avg Price — editable */}
                                <td className="text-right py-2.5 px-3">
                                  {isEditing
                                    ? <input type="number" value={editAvgCost} onChange={e => setEditAvgCost(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') saveEdit(e as any); if (e.key === 'Escape') cancelEdit(e as any); }} className={inputCls} style={{ width: 80 }} />
                                    : <span className="text-crypto-silver">{fmt(h.avgCost)}</span>
                                  }
                                </td>
                                <td className="text-right py-2.5 px-3" style={{ color: '#5cc8f0', fontWeight: 600 }}>
                                  <span className="inline-flex items-center justify-end gap-1.5">
                                    {loadingQuotes && !h.currentPrice ? <span className="animate-pulse text-crypto-silver">Loading...</span> : quotesError && !h.currentPrice ? <span className="text-yellow-500 text-xs">Unavailable</span> : h.currentPrice > 0 ? fmt(h.currentPrice) : <span className="text-crypto-silver/50">—</span>}
                                    {h.priceMeta && h.currentPrice > 0 && (
                                      <PriceFreshnessBadge compact meta={h.priceMeta} />
                                    )}
                                  </span>
                                </td>
                                {/* Invested — live preview when editing */}
                                <td className="text-right py-2.5 px-3 font-medium" style={{ color: isEditing ? '#c4b5fd' : '#a78bfa' }}>
                                  {isEditing ? fmt(editedInvested) : fmt(h.avgCost * h.shares)}
                                </td>
                                {/* Value — current market value */}
                                <td className="text-right py-2.5 px-3 font-medium" style={{ color: '#5cc8f0' }}>
                                  {h.currentPrice > 0 ? fmt(h.currentPrice * h.shares) : <span className="text-crypto-silver/50">—</span>}
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
                                {/* Actions */}
                                <td className="text-right py-2.5 pl-3">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={saveEdit} disabled={savingEdit} title="Save changes" className="p-1 rounded transition-all hover:bg-green-500/15" style={{ color: '#4ade80', opacity: savingEdit ? 0.4 : 1 }}>
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={cancelEdit} title="Cancel" className="p-1 rounded transition-all hover:bg-red-500/15" style={{ color: '#f87171' }}>
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={e => startEdit(h, e)} title="Edit shares / avg cost / entry date" className="opacity-40 hover:opacity-100 transition-all p-1" style={{ color: '#5cc8f0' }}>
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={e => { e.stopPropagation(); openSellModal(h); }}
                                        title="Sell / Trim position"
                                        className="opacity-40 hover:opacity-100 transition-all p-1"
                                        style={{ color: '#475569' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                        onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })()}
                          {/* Close Position Confirmation Row */}
                          {isExpanded && (
                            <tr style={{ borderBottom: '1px solid #1a1c3a' }}>
                              <td colSpan={9} className="p-0">
                                <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px' }}>
                                  <div className="flex gap-1 mb-1.5">
                                    {[{l:'1H',v:'60'},{l:'4H',v:'240'},{l:'1D',v:'D'},{l:'1W',v:'W'},{l:'1M',v:'M'}].map(iv => (
                                      <button key={iv.v} onClick={(e) => { e.stopPropagation(); setPortfolioChartInterval(iv.v); }}
                                        className="text-[9px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors"
                                        style={{ background: portfolioChartInterval === iv.v ? 'rgba(92, 200, 240, 0.12)' : 'transparent', color: portfolioChartInterval === iv.v ? '#5cc8f0' : '#64748b', border: `1px solid ${portfolioChartInterval === iv.v ? 'rgba(92, 200, 240, 0.25)' : 'rgba(255,255,255,0.06)'}` }}
                                      >{iv.l}</button>
                                    ))}
                                  </div>
                                  <div className="rounded-lg overflow-hidden my-2" style={{ border: '1px solid rgba(56, 78, 119, 0.2)' }}>
                                    <iframe
                                      src={`https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=400&interval=${portfolioChartInterval}&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(getTradingViewSymbol(h.ticker, h.assetType, h.quote?.tradingview_symbol))}`}
                                      style={{ width: '100%', height: 400, border: 'none', display: 'block' }}
                                      title={`${h.ticker} chart`}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-2.5 mt-3">
                                    {q?.changesPercentage != null && (
                                      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(32, 144, 208, 0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Price Change</div>
                                        <div className={`text-sm font-semibold ${q.changesPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {q.changesPercentage >= 0 ? '+' : ''}{q.changesPercentage.toFixed(2)}%
                                        </div>
                                      </div>
                                    )}
                                    {(h.assetType === 'stock' || h.assetType === 'crypto' || !h.assetType) && q?.marketCap != null && q.marketCap > 0 && (
                                      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(32, 144, 208, 0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Market Cap</div>
                                        <div className="text-sm font-semibold text-white">
                                          ${q.marketCap >= 1e12 ? (q.marketCap / 1e12).toFixed(1) + 'T' : q.marketCap >= 1e9 ? (q.marketCap / 1e9).toFixed(1) + 'B' : q.marketCap >= 1e6 ? (q.marketCap / 1e6).toFixed(1) + 'M' : q.marketCap.toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                    {q?.volume != null && q.volume > 0 && (
                                      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(32, 144, 208, 0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Volume</div>
                                        <div className="text-sm font-semibold text-white">
                                          {q.volume >= 1e9 ? (q.volume / 1e9).toFixed(1) + 'B' : q.volume >= 1e6 ? (q.volume / 1e6).toFixed(1) + 'M' : q.volume >= 1e3 ? (q.volume / 1e3).toFixed(1) + 'K' : q.volume.toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                    {(() => {
                                      const sectorLabel = h.assetType === 'crypto' ? 'Crypto' : h.assetType === 'commodity' ? 'Commodities' : h.assetType === 'etf' ? (q?.sector && q.sector !== 'Unknown' ? q.sector : 'ETFs') : (q?.sector && q.sector !== 'Unknown' ? q.sector : null);
                                      return sectorLabel ? (
                                        <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(32, 144, 208, 0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                          <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Sector</div>
                                          <div className="text-sm font-semibold text-white">{sectorLabel}</div>
                                        </div>
                                      ) : null;
                                    })()}
                                    {(h.assetType === 'stock' || !h.assetType) && q?.pe != null && q.pe > 0 && (
                                      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(32, 144, 208, 0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="text-[10px] text-crypto-silver uppercase tracking-wider">P/E Ratio</div>
                                        <div className="text-sm font-semibold text-white">{q.pe.toFixed(1)}</div>
                                      </div>
                                    )}
                                    {(h.assetType === 'stock' || !h.assetType) && q?.eps != null && q.eps !== 0 && (
                                      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(32, 144, 208, 0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="text-[10px] text-crypto-silver uppercase tracking-wider">EPS</div>
                                        <div className="text-sm font-semibold text-white">${q.eps.toFixed(2)}</div>
                                      </div>
                                    )}
                                    {(h.assetType === 'stock' || !h.assetType) && target && (
                                      <>
                                        <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(32, 144, 208, 0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                          <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Target Consensus</div>
                                          <div className={`text-sm font-semibold ${target.targetConsensus > h.currentPrice ? 'text-green-400' : 'text-red-400'}`}>
                                            ${target.targetConsensus?.toFixed(2)}
                                          </div>
                                          <div className="text-[10px] text-crypto-silver">
                                            {h.currentPrice > 0 ? ((((target.targetConsensus - h.currentPrice) / h.currentPrice) * 100).toFixed(1) + '% upside') : ''}
                                          </div>
                                        </div>
                                        <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(32, 144, 208, 0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                          <div className="text-[10px] text-crypto-silver uppercase tracking-wider">Target Range</div>
                                          <div className="text-sm font-semibold text-white">${target.targetLow?.toFixed(0)} – ${target.targetHigh?.toFixed(0)}</div>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {/* Buy History & Add Buy */}
                                  <div className="mt-4" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Buy History</span>
                                      <button
                                        onClick={() => {
                                          if (buyFormTicker === h.ticker) {
                                            setBuyFormTicker(null);
                                          } else {
                                            setBuyShares(''); setBuyPrice(''); setBuyDate(new Date().toISOString().split('T')[0]); setBuyNotes(''); setBuyError('');
                                            setBuyFormTicker(h.ticker);
                                          }
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                                        style={{ background: 'rgba(74,222,128,0.10)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                                      >
                                        <Plus className="w-3 h-3" />
                                        Add Buy
                                      </button>
                                    </div>
                                    {(() => {
                                      const lots = lotsData[h.ticker];
                                      const rows: Array<{ date: string; shares: number; price: number; notes?: string }> =
                                        lots && lots.length > 0
                                          ? lots
                                          : [{ date: (h.entry_date || h.addedAt || '').split('T')[0] || '—', shares: h.shares, price: h.avgCost }];
                                      return (
                                        <div style={{ overflowX: 'auto' }}>
                                          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                                            <thead>
                                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                <th className="text-left py-1.5 pr-3 font-medium" style={{ color: '#64748b' }}>Date</th>
                                                <th className="text-right py-1.5 px-3 font-medium" style={{ color: '#64748b' }}>Shares</th>
                                                <th className="text-right py-1.5 px-3 font-medium" style={{ color: '#64748b' }}>Price</th>
                                                <th className="text-right py-1.5 px-3 font-medium" style={{ color: '#64748b' }}>Cost</th>
                                                <th className="text-left py-1.5 pl-2 font-medium" style={{ color: '#64748b' }}>Notes</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {rows.map((lot, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                  <td className="py-1.5 pr-3" style={{ color: '#94a3b8' }}>{lot.date || '—'}</td>
                                                  <td className="text-right py-1.5 px-3 text-white">{lot.shares?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                                                  <td className="text-right py-1.5 px-3" style={{ color: '#5cc8f0' }}>{fmt(lot.price)}</td>
                                                  <td className="text-right py-1.5 px-3" style={{ color: '#a78bfa' }}>{fmt(lot.shares * lot.price)}</td>
                                                  <td className="text-left py-1.5 pl-2" style={{ color: '#64748b' }}>{lot.notes || ''}</td>
                                                </tr>
                                              ))}
                                              {rows.length > 1 && (
                                                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                                  <td className="py-1.5 pr-3 font-semibold" style={{ color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total / Avg</td>
                                                  <td className="text-right py-1.5 px-3 font-semibold text-white">{h.shares.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                                                  <td className="text-right py-1.5 px-3 font-semibold" style={{ color: '#5cc8f0' }}>{fmt(h.avgCost)}</td>
                                                  <td className="text-right py-1.5 px-3 font-semibold" style={{ color: '#a78bfa' }}>{fmt(h.avgCost * h.shares)}</td>
                                                  <td></td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      );
                                    })()}
                                    {buyFormTicker === h.ticker && (
                                      <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
                                        <div className="flex flex-wrap gap-2 items-end">
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] uppercase tracking-wider" style={{ color: '#64748b' }}>Shares</label>
                                            <input
                                              type="number"
                                              value={buyShares}
                                              onChange={e => setBuyShares(e.target.value)}
                                              placeholder="0"
                                              onClick={e => e.stopPropagation()}
                                              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); addBuyLot(h.ticker); } }}
                                              className="rounded px-2.5 py-1.5 text-sm text-white focus:outline-none w-24"
                                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
                                              autoFocus
                                            />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] uppercase tracking-wider" style={{ color: '#64748b' }}>Price / share ($)</label>
                                            <input
                                              type="number"
                                              value={buyPrice}
                                              onChange={e => setBuyPrice(e.target.value)}
                                              placeholder="0.00"
                                              onClick={e => e.stopPropagation()}
                                              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); addBuyLot(h.ticker); } }}
                                              className="rounded px-2.5 py-1.5 text-sm text-white focus:outline-none w-28"
                                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
                                            />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] uppercase tracking-wider" style={{ color: '#64748b' }}>Date</label>
                                            <input
                                              type="date"
                                              value={buyDate}
                                              onChange={e => setBuyDate(e.target.value)}
                                              onClick={e => e.stopPropagation()}
                                              className="rounded px-2.5 py-1.5 text-sm text-white focus:outline-none w-36"
                                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', colorScheme: 'dark' as any }}
                                            />
                                          </div>
                                          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                                            <label className="text-[10px] uppercase tracking-wider" style={{ color: '#64748b' }}>Notes (optional)</label>
                                            <input
                                              type="text"
                                              value={buyNotes}
                                              onChange={e => setBuyNotes(e.target.value)}
                                              placeholder="e.g. dip buy"
                                              onClick={e => e.stopPropagation()}
                                              className="rounded px-2.5 py-1.5 text-sm text-white focus:outline-none"
                                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
                                            />
                                          </div>
                                          <button
                                            onClick={e => { e.stopPropagation(); addBuyLot(h.ticker); }}
                                            disabled={addingBuy || !buyShares || !buyPrice}
                                            className="px-3 py-1.5 rounded text-sm font-medium text-white transition-all disabled:opacity-40"
                                            style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)', boxShadow: '0 0 8px rgba(74,222,128,0.2)' }}
                                          >
                                            {addingBuy ? 'Saving…' : 'Confirm'}
                                          </button>
                                          <button
                                            onClick={e => { e.stopPropagation(); setBuyFormTicker(null); setBuyError(''); }}
                                            className="px-3 py-1.5 rounded text-sm transition-all"
                                            style={{ color: '#64748b' }}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                        {buyError && <div className="mt-2 text-xs" style={{ color: '#f87171' }}>{buyError}</div>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Portfolio Totals */}
          {holdings.length > 0 && totalPortfolioValue > 0 && (
            <GlassCard className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Portfolio Totals</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-crypto-silver uppercase tracking-wider mb-1">Total Balance</div>
                  <div className="text-base font-bold" style={{ color: '#5cc8f0', textShadow: '0 0 8px rgba(92, 200, 240, 0.2)' }}>{fmt(totalPortfolioValue)}</div>
                </div>
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-crypto-silver uppercase tracking-wider mb-1">Total Invested</div>
                  <div className="text-base font-bold" style={{ color: '#a78bfa' }}>{fmt(totalCostBasis)}</div>
                </div>
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-crypto-silver uppercase tracking-wider mb-1">Daily P&L</div>
                  <div className={`text-base font-bold ${totalDailyPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPL(totalDailyPL)}</div>
                </div>
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-crypto-silver uppercase tracking-wider mb-1">Total P&L</div>
                  <div className={`text-base font-bold ${totalOverallPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span>{fmtPL(totalOverallPL)}</span>
                    <span className="text-[10px] ml-1 opacity-70">{totalCostBasis > 0 ? `(${totalOverallPL >= 0 ? '+' : ''}${((totalOverallPL / totalCostBasis) * 100).toFixed(1)}%)` : ''}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Section 2: Portfolio Visualization */}
          {holdings.length > 0 && totalPortfolioValue > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GlassCard className="p-3 sm:p-4">
                <h3 style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '1.1rem', marginBottom: 16 }}>Performance Scorecard</h3>
                <div className="h-[280px] flex items-center justify-center">
                  {tradeSummary ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <WinRateDonut winRate={tradeSummary.win_rate} />
                      <div className="grid grid-cols-3 gap-2 w-full">
                        {[
                          { label: 'Total Realized', value: `${(tradeSummary.total_realized_pnl ?? 0) >= 0 ? '+' : '-'}$${Math.abs(tradeSummary.total_realized_pnl ?? 0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`, color: (tradeSummary.total_realized_pnl ?? 0) >= 0 ? '#4ade80' : '#f87171' },
                          { label: `${tradeSummary.total_trades} Trades`, value: tradeSummary.best_pnl_pct ? `Best: ${tradeSummary.best_pnl_pct.symbol} +${tradeSummary.best_pnl_pct.realized_pnl_pct.toFixed(0)}%` : '—', color: '#a78bfa' },
                          { label: 'Avg Hold', value: tradeSummary.avg_holding_period_days > 0 ? `${tradeSummary.avg_holding_period_days}d` : '< 1d', color: '#94a3b8' },
                        ].map(s => (
                          <div key={s.label} className="rounded-lg px-2 py-2 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="text-xs font-bold truncate" style={{ color: s.color }}>{s.value}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-sm" style={{ color: '#64748b' }}>No closed trades yet</div>
                      <div className="text-xs mt-1" style={{ color: '#475569' }}>Win rate appears after your first closed position.</div>
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-3 sm:p-4">
                <h3 style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '1.1rem', marginBottom: 16 }}>Daily P&L by Position</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={plBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                      <YAxis type="category" dataKey="ticker" tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }} width={50} />
                      <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#e2e8f0' }} />
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

          {/* Section 3: Upcoming Events */}
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
              <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">No Holdings Yet</h3>
              <p className="text-sm text-crypto-silver mb-4">Add your first stock holding above to start tracking your portfolio with real-time data, charts, and AI analysis.</p>
            </GlassCard>
          )}

          {/* ── Trading Journal ─────────────────────────────────────── */}
          <GlassCard className="p-0 overflow-hidden">
            {/* Collapsible header */}
            <button
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
              onClick={() => setClosedPanelOpen(o => !o)}
            >
              <TrendingDown className="w-4 h-4 flex-shrink-0" style={{ color: '#64748b' }} />
              <span className="text-sm font-semibold text-white">Trading Journal</span>
              {(tradeGroups.length || tradeHistory.length) > 0 && (
                <span className="text-xs ml-1" style={{ color: '#64748b' }}>
                  {(tradeGroups.length || tradeHistory.length)} position{(tradeGroups.length || tradeHistory.length) !== 1 ? 's' : ''}
                </span>
              )}
              {tradeSummary && (
                <span className="ml-auto text-xs font-semibold" style={{ color: (tradeSummary.total_realized_pnl ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
                  {(tradeSummary.total_realized_pnl ?? 0) >= 0 ? '+' : ''}${Math.abs(tradeSummary.total_realized_pnl ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} realized
                </span>
              )}
              <span className="ml-2 flex-shrink-0" style={{ color: '#64748b' }}>
                {closedPanelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            </button>

            {closedPanelOpen && (
              <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

                {/* Wins / Losses pills */}
                {tradeSummary && (() => {
                  const g = tradeGroups.length ? tradeGroups : tradeHistory;
                  const pnlKey = tradeGroups.length ? 'total_realized_pnl' : 'realized_pnl';
                  const wins = g.filter((x: any) => (x[pnlKey] ?? 0) > 0).length;
                  const losses = g.filter((x: any) => (x[pnlKey] ?? 0) <= 0).length;
                  return (
                    <div className="flex items-center gap-2 pt-3 pb-2">
                      <div className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5" style={{ background: '#0d1623', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }}></div>
                        <span>{wins} Win{wins !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5" style={{ background: '#0d1623', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: '#f87171' }}></div>
                        <span>{losses} Loss{losses !== 1 ? 'es' : ''}</span>
                      </div>
                      <span className="text-xs" style={{ color: '#475569' }}>Avg hold: {tradeSummary.avg_holding_period_days > 0 ? `${tradeSummary.avg_holding_period_days}d` : '< 1d'}</span>
                    </div>
                  );
                })()}

                {/* Empty state */}
                {tradeGroups.length === 0 && tradeHistory.length === 0 && (
                  <div className="py-10 text-center">
                    <TrendingDown className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: '#64748b' }} />
                    <div className="text-sm text-slate-500">No closed positions yet</div>
                    <div className="text-xs text-slate-600 mt-1">Sell or trim a position to start building your trade history.</div>
                  </div>
                )}

                {/* Trade cards — grouped view when trade_groups available, flat fallback */}
                {(tradeGroups.length > 0 || tradeHistory.length > 0) && (() => {
                  const fmtP = (v: number) => v > 0 ? `$${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:4})}` : '—';
                  const fmtM = (v: number) => `$${Math.abs(v).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`;

                  if (tradeGroups.length > 0) {
                    // ── Grouped rendering (new backend format) ──────────────────
                    const partials    = tradeGroups.filter((g: any) => !g.is_fully_closed);
                    const fullyClosed = tradeGroups.filter((g: any) => g.is_fully_closed);

                    // Group fully-closed by month of final_exit_date
                    const monthBuckets: { monthKey: string; label: string; groups: any[] }[] = [];
                    fullyClosed.forEach((g: any) => {
                      const d = g.final_exit_date ? new Date(g.final_exit_date) : null;
                      const monthKey = d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : 'unknown';
                      const label    = d ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown Date';
                      const last = monthBuckets[monthBuckets.length - 1];
                      if (last && last.monthKey === monthKey) { last.groups.push(g); }
                      else { monthBuckets.push({ monthKey, label, groups: [g] }); }
                    });

                    const renderGroupCard = (g: any) => {
                      const groupId     = g.trade_group_id ?? g.ticker;
                      const ticker      = (g.ticker ?? '').toUpperCase();
                      const avgEntry    = g.avg_entry_price ?? 0;
                      const avgExit     = g.avg_exit_price ?? 0;
                      const sharesSold  = g.total_shares_sold ?? 0;
                      const costBasis   = g.total_cost_basis ?? (sharesSold * avgEntry);
                      const pl          = g.total_realized_pnl ?? 0;
                      const plPct       = g.total_realized_pnl_pct ?? 0;
                      const isWin       = pl >= 0;
                      const borderClr   = g.is_fully_closed ? (isWin ? '#4ade80' : '#f87171') : '#d97706';
                      const plClr       = isWin ? '#4ade80' : '#f87171';
                      const exitDate    = g.final_exit_date ?? null;
                      const exitDisplay = exitDate
                        ? new Date(exitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—';
                      const sellEvents: any[] = g.sell_events ?? [];
                      const isExpandable = sellEvents.length > 1;
                      const isExpanded   = expandedGroupId === groupId;
                      // Use first event's id for single-event edit; multi-event groups use per-row edit in expanded view
                      const singleEventId = sellEvents.length === 1 ? (sellEvents[0].id ?? sellEvents[0].trade_id) : null;
                      const isEditing     = singleEventId != null && editingClosedId === singleEventId;

                      return (
                        <div
                          key={groupId}
                          className="rounded-xl p-4 flex flex-col gap-3"
                          style={{ background: isEditing ? 'rgba(92,200,240,0.04)' : '#0d1623', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `4px solid ${borderClr}` }}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-white tracking-tight">{ticker}</span>
                                {!g.is_fully_closed && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(217,119,6,0.15)', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)' }}>Partial</span>
                                )}
                                {g.is_fully_closed && sellEvents.length > 1 && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>{sellEvents.length} sells</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs tracking-wide" style={{ color: '#d97706' }}>{exitDisplay}</span>
                                {g.entry_date && <span className="text-[10px]" style={{ color: '#475569' }}>· opened {g.entry_date}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {isEditing ? (
                                <>
                                  <button onClick={saveClosedEdit} disabled={savingClosedEdit} title="Save" className="p-1 rounded hover:bg-green-500/15 transition-all" style={{ color: '#4ade80', opacity: savingClosedEdit ? 0.4 : 1 }}>
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={cancelClosedEdit} title="Cancel" className="p-1 rounded hover:bg-red-500/15 transition-all" style={{ color: '#f87171' }}>
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {isExpandable && (
                                    <button
                                      onClick={() => setExpandedGroupId(isExpanded ? null : groupId)}
                                      title={isExpanded ? 'Collapse sell history' : 'Expand sell history'}
                                      className="p-1 opacity-50 hover:opacity-100 transition-all"
                                      style={{ color: '#5cc8f0' }}
                                    >
                                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                  {singleEventId && (
                                    <button onClick={e => startClosedEdit(sellEvents[0], singleEventId, e)} title="Edit" className="p-1 opacity-30 hover:opacity-100 transition-all" style={{ color: '#5cc8f0' }}>
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                  {singleEventId && (
                                    <button onClick={e => deleteClosedTrade(singleEventId, e)} title="Delete" className="p-1 opacity-30 hover:opacity-100 transition-all" style={{ color: '#475569' }} onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Entry → Exit price bar */}
                          <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="flex flex-col">
                              <span style={{ color: '#64748b' }}>Avg Entry</span>
                              <span className="font-mono text-white">{fmtP(avgEntry)}</span>
                            </div>
                            <div className="flex-1 px-3 flex items-center">
                              <div className="h-px w-full" style={{ background: isWin ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)' }}></div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span style={{ color: '#64748b' }}>{g.is_fully_closed ? 'Avg Exit' : 'Last Exit'}</span>
                              {isEditing ? (
                                <input type="number" value={editClosedExitPrice} onChange={e => setEditClosedExitPrice(e.target.value)} className="w-20 bg-transparent border-b text-white text-right text-xs focus:outline-none font-mono" style={{ borderColor: 'rgba(92,200,240,0.6)' }} />
                              ) : (
                                <span className="font-mono text-white">{fmtP(avgExit)}</span>
                              )}
                            </div>
                          </div>

                          {/* Date edit rows */}
                          {isEditing && (
                            <div className="flex flex-col gap-1.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span style={{ color: '#64748b' }} className="w-16 flex-shrink-0">Open Date:</span>
                                <input type="date" value={editClosedEntryDate} onChange={e => setEditClosedEntryDate(e.target.value)} className="bg-transparent border-b text-white text-xs focus:outline-none flex-1" style={{ borderColor: 'rgba(217,119,6,0.5)', colorScheme: 'dark' as any }} />
                              </div>
                              <div className="flex items-center gap-2">
                                <span style={{ color: '#64748b' }} className="w-16 flex-shrink-0">Exit Date:</span>
                                <input type="date" value={editClosedExitDate} onChange={e => setEditClosedExitDate(e.target.value)} className="bg-transparent border-b text-white text-xs focus:outline-none flex-1" style={{ borderColor: 'rgba(92,200,240,0.4)', colorScheme: 'dark' as any }} />
                              </div>
                            </div>
                          )}

                          {/* Metrics */}
                          <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                            <div className="flex flex-col">
                              <span style={{ color: '#64748b' }}>Shares Sold</span>
                              <span style={{ color: '#e2e8f0' }}>{sharesSold.toLocaleString(undefined,{maximumFractionDigits:4})}</span>
                            </div>
                            <div className="flex flex-col">
                              <span style={{ color: '#64748b' }}>Cost Basis</span>
                              <span style={{ color: '#a78bfa' }}>{costBasis > 0 ? fmtM(costBasis) : '—'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span style={{ color: '#64748b' }}>Hold Time</span>
                              <span style={{ color: '#e2e8f0' }}>{(g.holding_period_days ?? 0) > 0 ? `${g.holding_period_days}d` : '< 1d'}</span>
                            </div>
                          </div>

                          {/* Expandable sell events table */}
                          {isExpandable && isExpanded && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>Sell History</div>
                              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="text-left py-1 pr-2 font-medium" style={{ color: '#64748b' }}>Date</th>
                                    <th className="text-right py-1 px-2 font-medium" style={{ color: '#64748b' }}>Shares</th>
                                    <th className="text-right py-1 px-2 font-medium" style={{ color: '#64748b' }}>Exit $</th>
                                    <th className="text-right py-1 pl-2 font-medium" style={{ color: '#64748b' }}>P&L</th>
                                    <th className="w-12"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sellEvents.map((ev: any, ei: number) => {
                                    const evId   = ev.id ?? ev.trade_id ?? String(ei);
                                    const evIsEd = editingClosedId === evId;
                                    const evPl   = ev.realized_pnl ?? 0;
                                    return (
                                      <tr key={evId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td className="py-1 pr-2" style={{ color: '#94a3b8' }}>{ev.exit_date ? new Date(ev.exit_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}</td>
                                        <td className="text-right py-1 px-2 text-white">{(ev.shares ?? 0).toLocaleString(undefined,{maximumFractionDigits:4})}</td>
                                        <td className="text-right py-1 px-2" style={{ color: '#5cc8f0' }}>{fmtP(ev.exit_price ?? 0)}</td>
                                        <td className="text-right py-1 pl-2 font-semibold" style={{ color: evPl >= 0 ? '#4ade80' : '#f87171' }}>{evPl >= 0 ? '+' : '-'}{fmtM(evPl)}</td>
                                        <td className="text-right py-1">
                                          {!evIsEd && (
                                            <button onClick={e => deleteClosedTrade(evId, e)} className="opacity-30 hover:opacity-100 transition-all p-0.5" style={{ color: '#475569' }} onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Divider */}
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }}></div>

                          {/* P&L footer */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[10px] mb-0.5" style={{ color: '#64748b' }}>Realized P&L</div>
                              <div className="text-lg font-bold" style={{ color: plClr }}>{isWin ? '+' : '-'}{fmtM(pl)}</div>
                            </div>
                            <span className="text-sm font-semibold px-2 py-1 rounded" style={{ background: isWin ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', color: plClr }}>
                              {isWin ? '+' : ''}{plPct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="flex flex-col gap-6">
                        {/* Partially closed section */}
                        {partials.length > 0 && (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold tracking-wide" style={{ color: '#d97706' }}>Partially Closed</span>
                              <div className="flex-1 h-px" style={{ background: 'rgba(217,119,6,0.2)' }}></div>
                              <span className="text-xs" style={{ color: '#475569' }}>{partials.length} position{partials.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                              {partials.map(renderGroupCard)}
                            </div>
                          </div>
                        )}
                        {/* Fully closed — grouped by month */}
                        {monthBuckets.map(({ monthKey, label, groups }) => (
                          <div key={monthKey} className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold tracking-wide" style={{ color: '#d97706' }}>{label}</span>
                              <div className="flex-1 h-px" style={{ background: 'rgba(217,119,6,0.2)' }}></div>
                              <span className="text-xs" style={{ color: '#475569' }}>{groups.length} position{groups.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                              {groups.map(renderGroupCard)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // ── Flat fallback (old backend) ────────────────────────────
                  const sorted = [...tradeHistory].sort((a: any, b: any) => {
                    const da = a.exit_date ? new Date(a.exit_date).getTime() : 0;
                    const db = b.exit_date ? new Date(b.exit_date).getTime() : 0;
                    return db - da;
                  });
                  const monthBuckets: { monthKey: string; label: string; trades: any[] }[] = [];
                  sorted.forEach((t: any) => {
                    const d = t.exit_date ? new Date(t.exit_date) : null;
                    const monthKey = d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : 'unknown';
                    const label    = d ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown Date';
                    const last = monthBuckets[monthBuckets.length - 1];
                    if (last && last.monthKey === monthKey) { last.trades.push(t); }
                    else { monthBuckets.push({ monthKey, label, trades: [t] }); }
                  });
                  return (
                    <div className="flex flex-col gap-6">
                      {monthBuckets.map(({ monthKey, label, trades }) => (
                        <div key={monthKey} className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold tracking-wide" style={{ color: '#d97706' }}>{label}</span>
                            <div className="flex-1 h-px" style={{ background: 'rgba(217,119,6,0.2)' }}></div>
                            <span className="text-xs" style={{ color: '#475569' }}>{trades.length} trade{trades.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {trades.map((t: any, i: number) => {
                              const tradeId   = t.id ?? t.trade_id ?? String((t.symbol ?? '') + (t.exit_date ?? '') + i);
                              const isEditing = editingClosedId === tradeId;
                              const ticker    = (t.symbol ?? t.ticker ?? '').toUpperCase();
                              const avgEntry  = t.avg_entry_price ?? t.entry_price ?? 0;
                              const shares    = t.shares ?? 0;
                              const invested  = shares * avgEntry;
                              const exitPrice = t.exit_price ?? 0;
                              const pl        = t.realized_pnl ?? 0;
                              const plPct     = t.realized_pnl_pct ?? 0;
                              const isWin     = pl >= 0;
                              const borderClr = isWin ? '#4ade80' : '#f87171';
                              const plClr     = isWin ? '#4ade80' : '#f87171';
                              const exitDisplay = t.exit_date ? new Date(t.exit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                              return (
                                <div key={tradeId} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: isEditing ? 'rgba(92,200,240,0.04)' : '#0d1623', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `4px solid ${borderClr}` }}>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="text-xl font-bold text-white tracking-tight">{ticker}</div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-xs tracking-wide" style={{ color: '#d97706' }}>{exitDisplay}</span>
                                        {t.sell_type && t.sell_type !== 'full' && (
                                          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(92,200,240,0.15)', color: '#5cc8f0' }}>trim</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {isEditing ? (
                                        <>
                                          <button onClick={saveClosedEdit} disabled={savingClosedEdit} title="Save" className="p-1 rounded hover:bg-green-500/15 transition-all" style={{ color: '#4ade80', opacity: savingClosedEdit ? 0.4 : 1 }}><Check className="w-3.5 h-3.5" /></button>
                                          <button onClick={cancelClosedEdit} title="Cancel" className="p-1 rounded hover:bg-red-500/15 transition-all" style={{ color: '#f87171' }}><X className="w-3.5 h-3.5" /></button>
                                        </>
                                      ) : (
                                        <>
                                          <button onClick={e => startClosedEdit(t, tradeId, e)} title="Edit" className="p-1 opacity-30 hover:opacity-100 transition-all" style={{ color: '#5cc8f0' }}><Pencil className="w-3 h-3" /></button>
                                          <button onClick={e => deleteClosedTrade(tradeId, e)} title="Delete" className="p-1 opacity-30 hover:opacity-100 transition-all" style={{ color: '#475569' }} onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#475569')}><Trash2 className="w-3 h-3" /></button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div className="flex flex-col"><span style={{ color: '#64748b' }}>Entry</span><span className="font-mono text-white">{fmtP(avgEntry)}</span></div>
                                    <div className="flex-1 px-3 flex items-center"><div className="h-px w-full" style={{ background: isWin ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)' }}></div></div>
                                    <div className="flex flex-col items-end">
                                      <span style={{ color: '#64748b' }}>{isEditing ? 'New Exit' : 'Exit'}</span>
                                      {isEditing ? <input type="number" value={editClosedExitPrice} onChange={e => setEditClosedExitPrice(e.target.value)} className="w-20 bg-transparent border-b text-white text-right text-xs focus:outline-none font-mono" style={{ borderColor: 'rgba(92,200,240,0.6)' }} /> : <span className="font-mono text-white">{fmtP(exitPrice)}</span>}
                                    </div>
                                  </div>
                                  {isEditing && (
                                    <div className="flex flex-col gap-1.5 text-xs">
                                      <div className="flex items-center gap-2"><span style={{ color: '#64748b' }} className="w-16 flex-shrink-0">Open Date:</span><input type="date" value={editClosedEntryDate} onChange={e => setEditClosedEntryDate(e.target.value)} className="bg-transparent border-b text-white text-xs focus:outline-none flex-1" style={{ borderColor: 'rgba(217,119,6,0.5)', colorScheme: 'dark' as any }} /></div>
                                      <div className="flex items-center gap-2"><span style={{ color: '#64748b' }} className="w-16 flex-shrink-0">Exit Date:</span><input type="date" value={editClosedExitDate} onChange={e => setEditClosedExitDate(e.target.value)} className="bg-transparent border-b text-white text-xs focus:outline-none flex-1" style={{ borderColor: 'rgba(92,200,240,0.4)', colorScheme: 'dark' as any }} /></div>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                                    <div className="flex flex-col"><span style={{ color: '#64748b' }}>Shares</span><span style={{ color: '#e2e8f0' }}>{shares.toLocaleString(undefined,{maximumFractionDigits:4})}</span></div>
                                    <div className="flex flex-col"><span style={{ color: '#64748b' }}>Invested</span><span style={{ color: '#a78bfa' }}>{invested > 0 ? fmtM(invested) : '—'}</span></div>
                                    <div className="flex flex-col"><span style={{ color: '#64748b' }}>Hold Time</span><span style={{ color: '#e2e8f0' }}>{(t.holding_period_days ?? 0) > 0 ? `${t.holding_period_days}d` : '< 1d'}</span></div>
                                  </div>
                                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }}></div>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-[10px] mb-0.5" style={{ color: '#64748b' }}>Realized P&L</div>
                                      <div className="text-lg font-bold" style={{ color: plClr }}>{isWin ? '+' : '-'}{fmtM(pl)}</div>
                                    </div>
                                    <span className="text-sm font-semibold px-2 py-1 rounded" style={{ background: isWin ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', color: plClr }}>{isWin ? '+' : ''}{plPct.toFixed(1)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </GlassCard>
          {/* ────────────────────────────────────────────────────────────── */}

          {/* Section 6: Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 pb-4">
            {[
              { name: 'Schwab', url: 'https://client.schwab.com/clientapps/accounts/summary/' },
              { name: 'Robinhood', url: 'https://robinhood.com/us/en/' },
              { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/portfolios' },
              { name: 'Empower', url: 'https://home.personalcapital.com/page/login/app#/dashboard' },
              { name: 'Snowball', url: 'https://snowball-analytics.com/dashboard' },
              { name: 'Simply Wall St', url: 'https://simplywall.st/portfolio/65b1f9ab-7fa4-4d25-95c6-b8fa93d94d77/holdings' },
            ].map(link => (
              <button key={link.name} onClick={() => openInNewTab(link.url)} className="transition-all duration-300 text-xs hover:text-white flex items-center gap-1.5" style={{ background: 'rgba(32, 144, 208, 0.08)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', borderRadius: 8, padding: '8px 16px' }}>
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
