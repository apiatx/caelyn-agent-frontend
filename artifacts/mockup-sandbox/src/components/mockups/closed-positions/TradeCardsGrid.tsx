import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Clock, CalendarDays, Activity } from 'lucide-react';

const trades = [
  { symbol:"NVDA", shares:10, avg_entry_price:420, exit_price:875, current_price:895, realized_pnl:4550, realized_pnl_pct:108.3, holding_period_days:187, exit_date:"2024-11-14", sell_type:"full" },
  { symbol:"AAPL", shares:25, avg_entry_price:162, exit_price:195, current_price:211, realized_pnl:825, realized_pnl_pct:20.4, holding_period_days:62, exit_date:"2024-09-03", sell_type:"trim" },
  { symbol:"TSLA", shares:15, avg_entry_price:245, exit_price:198, current_price:175, realized_pnl:-705, realized_pnl_pct:-19.2, holding_period_days:34, exit_date:"2024-08-18", sell_type:"full" },
  { symbol:"META", shares:8, avg_entry_price:310, exit_price:512, current_price:530, realized_pnl:1616, realized_pnl_pct:65.2, holding_period_days:143, exit_date:"2025-01-22", sell_type:"full" },
  { symbol:"AMZN", shares:12, avg_entry_price:178, exit_price:220, current_price:215, realized_pnl:504, realized_pnl_pct:23.6, holding_period_days:78, exit_date:"2024-10-30", sell_type:"trim" },
  { symbol:"COIN", shares:20, avg_entry_price:88, exit_price:71, current_price:185, realized_pnl:-340, realized_pnl_pct:-19.3, holding_period_days:19, exit_date:"2024-07-12", sell_type:"full" },
  { symbol:"AMD",  shares:30, avg_entry_price:145, exit_price:172, current_price:160, realized_pnl:810, realized_pnl_pct:18.6, holding_period_days:91, exit_date:"2024-12-05", sell_type:"full" },
];

const summary = {
  total_realized_pnl: 7260,
  win_rate: 71,
  total_trades: 7,
  best_symbol: "NVDA",
  best_pnl_pct: 108.3,
  avg_holding_period_days: 87,
  wins: 5,
  losses: 2
};

const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);

export default function TradeCardsGrid() {
  return (
    <div style={{ backgroundColor: '#080c13', minHeight: '100vh', width: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }} className="p-8 text-[#e2e8f0]">
      
      {/* Header & Summary */}
      <div className="mb-8 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Closed Positions</h1>
          <p className="text-[#94a3b8]">Review your realized trades and performance history.</p>
        </div>
        
        <div style={{ backgroundColor: '#0d1623', borderColor: 'rgba(255,255,255,0.06)' }} className="rounded-xl border p-6 flex flex-wrap items-center justify-between gap-6 shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm text-[#94a3b8] mb-1 font-medium">Total Realized P&L</span>
            <span className={`text-3xl font-bold ${summary.total_realized_pnl >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
              {summary.total_realized_pnl >= 0 ? '+' : ''}{formatCurrency(summary.total_realized_pnl)}
            </span>
          </div>
          
          <div className="flex gap-10">
            <div className="flex flex-col">
              <span className="text-sm text-[#94a3b8] mb-1 flex items-center gap-1.5"><Activity className="w-4 h-4"/> Win Rate</span>
              <span className="text-xl font-semibold text-white">{summary.win_rate}% <span className="text-sm font-normal text-[#64748b] ml-1">({summary.total_trades} trades)</span></span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-[#94a3b8] mb-1 flex items-center gap-1.5"><TrendingUp className="w-4 h-4"/> Best Trade</span>
              <span className="text-xl font-semibold text-white">{summary.best_symbol} <span className="text-[#4ade80] text-sm ml-1">+{summary.best_pnl_pct}%</span></span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-[#94a3b8] mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4"/> Avg Hold</span>
              <span className="text-xl font-semibold text-white">{summary.avg_holding_period_days} days</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-[#0d1623] border border-[rgba(255,255,255,0.06)] text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#4ade80]"></div>
            <span>{summary.wins} Wins</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-[#0d1623] border border-[rgba(255,255,255,0.06)] text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#f87171]"></div>
            <span>{summary.losses} Losses</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-5">
        {trades.map((trade, idx) => {
          const isWin = trade.realized_pnl >= 0;
          const colorClass = isWin ? 'text-[#4ade80]' : 'text-[#f87171]';
          const borderColor = isWin ? '#4ade80' : '#f87171';

          return (
            <div 
              key={idx} 
              style={{ backgroundColor: '#0d1623', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `4px solid ${borderColor}` }} 
              className="rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:bg-[#121d2d] transition-colors"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="text-2xl font-bold text-white tracking-tight">{trade.symbol}</div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${trade.sell_type === 'full' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'bg-[#5cc8f0]/20 text-[#5cc8f0]'}`}>
                    {trade.sell_type}
                  </span>
                </div>
              </div>

              {/* Price Path */}
              <div className="flex items-center justify-between text-sm my-1 py-3 px-4 rounded-lg bg-[#080c13] border border-[rgba(255,255,255,0.04)]">
                <div className="flex flex-col">
                  <span className="text-[#64748b] text-xs">Entry</span>
                  <span className="font-mono text-white">{formatPrice(trade.avg_entry_price)}</span>
                </div>
                <div className="flex-1 px-4 flex items-center justify-center relative">
                  <div className={`h-px w-full ${isWin ? 'bg-[#4ade80]/30' : 'bg-[#f87171]/30'}`}></div>
                  <div className={`absolute p-1 rounded-full bg-[#080c13] border border-[rgba(255,255,255,0.04)] ${colorClass}`}>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[#64748b] text-xs">Exit</span>
                  <span className="font-mono text-white">{formatPrice(trade.exit_price)}</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mt-1">
                <div className="flex flex-col">
                  <span className="text-[#64748b] text-xs mb-0.5">Shares</span>
                  <span className="text-[#e2e8f0] font-medium">{trade.shares}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#64748b] text-xs mb-0.5">Invested</span>
                  <span className="text-[#e2e8f0] font-medium">{formatCurrency(trade.shares * trade.avg_entry_price)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#64748b] text-xs mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3"/> Hold Time</span>
                  <span className="text-[#e2e8f0] font-medium">{trade.holding_period_days}d</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#64748b] text-xs mb-0.5 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> Exit Date</span>
                  <span className="text-[#e2e8f0] font-medium">{new Date(trade.exit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                </div>
              </div>

              <div className="h-px w-full bg-[rgba(255,255,255,0.06)] mt-1 mb-1"></div>

              {/* Footer PNL */}
              <div className="flex items-end justify-between mt-auto pt-1">
                <div className="flex flex-col">
                  <span className="text-[#64748b] text-xs mb-1">Realized P&L</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold tracking-tight ${colorClass}`}>
                      {isWin ? '+' : ''}{formatCurrency(trade.realized_pnl)}
                    </span>
                    <span className={`text-sm font-semibold px-1.5 py-0.5 rounded ${isWin ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f87171]/10 text-[#f87171]'}`}>
                      {isWin ? '+' : ''}{trade.realized_pnl_pct}%
                    </span>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
