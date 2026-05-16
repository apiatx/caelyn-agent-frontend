import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const mockTrades = [
  { symbol: "NVDA", shares: 10, avg_entry_price: 420, exit_price: 875, current_price: 895, realized_pnl: 4550, realized_pnl_pct: 108.3, holding_period_days: 187, exit_date: "2024-11-14", sell_type: "full" },
  { symbol: "AAPL", shares: 25, avg_entry_price: 162, exit_price: 195, current_price: 211, realized_pnl: 825, realized_pnl_pct: 20.4, holding_period_days: 62, exit_date: "2024-09-03", sell_type: "trim" },
  { symbol: "TSLA", shares: 15, avg_entry_price: 245, exit_price: 198, current_price: 175, realized_pnl: -705, realized_pnl_pct: -19.2, holding_period_days: 34, exit_date: "2024-08-18", sell_type: "full" },
  { symbol: "META", shares: 8, avg_entry_price: 310, exit_price: 512, current_price: 530, realized_pnl: 1616, realized_pnl_pct: 65.2, holding_period_days: 143, exit_date: "2025-01-22", sell_type: "full" },
  { symbol: "AMZN", shares: 12, avg_entry_price: 178, exit_price: 220, current_price: 215, realized_pnl: 504, realized_pnl_pct: 23.6, holding_period_days: 78, exit_date: "2024-10-30", sell_type: "trim" },
  { symbol: "COIN", shares: 20, avg_entry_price: 88, exit_price: 71, current_price: 185, realized_pnl: -340, realized_pnl_pct: -19.3, holding_period_days: 19, exit_date: "2024-07-12", sell_type: "full" },
  { symbol: "AMD",  shares: 30, avg_entry_price: 145, exit_price: 172, current_price: 160, realized_pnl: 810, realized_pnl_pct: 18.6, holding_period_days: 91, exit_date: "2024-12-05", sell_type: "full" },
];

const summary = {
  total_realized_pnl: 7260,
  win_rate: 71,
  total_trades: 7,
  best: { symbol: "NVDA", realized_pnl_pct: 108.3 },
  avg_hold: 87
};

type SortKey = keyof typeof mockTrades[0] | 'invested';

export function BloombergTable() {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const sortedTrades = useMemo(() => {
    let sortableItems = [...mockTrades];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        if (sortConfig.key === 'invested') {
          aValue = a.shares * a.avg_entry_price;
          bValue = b.shares * b.avg_entry_price;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <span className="w-3" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1" /> : <ArrowDown className="w-3 h-3 inline ml-1" />;
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatPct = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

  return (
    <div className="min-h-screen p-6 w-[1100px]" style={{ backgroundColor: '#080c13', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      
      {/* Stats Strip */}
      <div className="flex items-center space-x-6 mb-4 text-sm" style={{ color: '#e2e8f0' }}>
        <div className="flex items-baseline space-x-2">
          <span style={{ color: '#94a3b8' }}>Total P&L:</span>
          <span className="font-mono text-base" style={{ color: summary.total_realized_pnl >= 0 ? '#4ade80' : '#f87171' }}>
            {summary.total_realized_pnl > 0 ? '+' : ''}{formatCurrency(summary.total_realized_pnl)}
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span style={{ color: '#94a3b8' }}>Win Rate:</span>
          <span className="font-mono text-base text-white">{summary.win_rate}%</span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span style={{ color: '#94a3b8' }}>Trades:</span>
          <span className="font-mono text-base text-white">{summary.total_trades}</span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span style={{ color: '#94a3b8' }}>Best:</span>
          <span className="font-mono text-base text-white">{summary.best.symbol} <span style={{ color: '#4ade80' }}>+{summary.best.realized_pnl_pct}%</span></span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span style={{ color: '#94a3b8' }}>Avg Hold:</span>
          <span className="font-mono text-base text-white">{summary.avg_hold}d</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-[rgba(255,255,255,0.06)] rounded-sm" style={{ backgroundColor: '#0d1623' }}>
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)] uppercase tracking-wider text-xs" style={{ color: '#5cc8f0' }}>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5" onClick={() => requestSort('symbol')}>Ticker{getSortIcon('symbol')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-right" onClick={() => requestSort('shares')}>Shares{getSortIcon('shares')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-right" onClick={() => requestSort('avg_entry_price')}>Avg Entry{getSortIcon('avg_entry_price')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-right" onClick={() => requestSort('invested')}>Invested{getSortIcon('invested')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-right" onClick={() => requestSort('exit_price')}>Exit Price{getSortIcon('exit_price')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-right" onClick={() => requestSort('current_price')}>Cur Price{getSortIcon('current_price')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-right" onClick={() => requestSort('realized_pnl')}>P&L ${getSortIcon('realized_pnl')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-right" onClick={() => requestSort('realized_pnl_pct')}>P&L %{getSortIcon('realized_pnl_pct')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-right" onClick={() => requestSort('holding_period_days')}>Days{getSortIcon('holding_period_days')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-right" onClick={() => requestSort('exit_date')}>Exit Date{getSortIcon('exit_date')}</th>
              <th className="px-3 py-2 cursor-pointer hover:bg-white/5 text-center" onClick={() => requestSort('sell_type')}>Type{getSortIcon('sell_type')}</th>
            </tr>
          </thead>
          <tbody className="font-mono text-sm">
            {sortedTrades.map((trade, idx) => {
              const invested = trade.shares * trade.avg_entry_price;
              const isWin = trade.realized_pnl >= 0;
              const pnlColorClass = isWin ? 'text-[#4ade80]' : 'text-[#f87171]';
              const pnlBgColor = isWin ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)';
              
              return (
                <tr key={`${trade.symbol}-${idx}`} className="border-b border-[rgba(255,255,255,0.02)]" style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td className="px-3 py-1.5 font-sans font-medium">{trade.symbol}</td>
                  <td className="px-3 py-1.5 text-right">{trade.shares}</td>
                  <td className="px-3 py-1.5 text-right">{formatCurrency(trade.avg_entry_price)}</td>
                  <td className="px-3 py-1.5 text-right">{formatCurrency(invested)}</td>
                  <td className="px-3 py-1.5 text-right">{formatCurrency(trade.exit_price)}</td>
                  <td className="px-3 py-1.5 text-right">{formatCurrency(trade.current_price)}</td>
                  <td className={`px-3 py-1.5 text-right ${pnlColorClass}`} style={{ backgroundColor: pnlBgColor }}>
                    {trade.realized_pnl > 0 ? '+' : ''}{formatCurrency(trade.realized_pnl)}
                  </td>
                  <td className={`px-3 py-1.5 text-right ${pnlColorClass}`} style={{ backgroundColor: pnlBgColor }}>
                    {formatPct(trade.realized_pnl_pct)}
                  </td>
                  <td className="px-3 py-1.5 text-right">{trade.holding_period_days}</td>
                  <td className="px-3 py-1.5 text-right">{trade.exit_date}</td>
                  <td className="px-3 py-1.5 text-center font-sans">
                    <span className={`text-xs px-1.5 py-0.5 rounded-sm ${trade.sell_type === 'full' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'bg-white/10 text-[#94a3b8]'}`}>
                      {trade.sell_type.toUpperCase()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BloombergTable;
