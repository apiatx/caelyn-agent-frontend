import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Clock, Activity, Calendar, Info } from 'lucide-react';

interface Trade {
  symbol: string;
  shares: number;
  avg_entry_price: number;
  exit_price: number;
  current_price: number;
  realized_pnl: number;
  realized_pnl_pct: number;
  holding_period_days: number;
  exit_date: string;
  sell_type: "full" | "trim";
}

const mockTrades: Trade[] = [
  { symbol: "META", shares: 8, avg_entry_price: 310, exit_price: 512, current_price: 530, realized_pnl: 1616, realized_pnl_pct: 65.2, holding_period_days: 143, exit_date: "2025-01-22", sell_type: "full" },
  { symbol: "AMD", shares: 30, avg_entry_price: 145, exit_price: 172, current_price: 160, realized_pnl: 810, realized_pnl_pct: 18.6, holding_period_days: 91, exit_date: "2024-12-05", sell_type: "full" },
  { symbol: "NVDA", shares: 10, avg_entry_price: 420, exit_price: 875, current_price: 895, realized_pnl: 4550, realized_pnl_pct: 108.3, holding_period_days: 187, exit_date: "2024-11-14", sell_type: "full" },
  { symbol: "AMZN", shares: 12, avg_entry_price: 178, exit_price: 220, current_price: 215, realized_pnl: 504, realized_pnl_pct: 23.6, holding_period_days: 78, exit_date: "2024-10-30", sell_type: "trim" },
  { symbol: "AAPL", shares: 25, avg_entry_price: 162, exit_price: 195, current_price: 211, realized_pnl: 825, realized_pnl_pct: 20.4, holding_period_days: 62, exit_date: "2024-09-03", sell_type: "trim" },
  { symbol: "TSLA", shares: 15, avg_entry_price: 245, exit_price: 198, current_price: 175, realized_pnl: -705, realized_pnl_pct: -19.2, holding_period_days: 34, exit_date: "2024-08-18", sell_type: "full" },
  { symbol: "COIN", shares: 20, avg_entry_price: 88, exit_price: 71, current_price: 185, realized_pnl: -340, realized_pnl_pct: -19.3, holding_period_days: 19, exit_date: "2024-07-12", sell_type: "full" },
];

const summary = {
  total_realized_pnl: 7260,
  win_rate: 71,
  total_trades: 7,
  best: { symbol: "NVDA", realized_pnl_pct: 108.3 },
  avg_hold: 87
};

function formatCurrency(val: number) {
  const prefix = val >= 0 ? '+' : '-';
  const abs = Math.abs(val);
  return `${prefix}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function getNaturalDuration(days: number) {
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''}`;
}

export function TradeJournalTimeline() {
  return (
    <div 
      className="min-h-screen p-6 w-full flex justify-center font-sans antialiased"
      style={{ backgroundColor: '#080c13', color: '#e2e8f0' }}
    >
      <div className="w-[1100px] max-w-full flex flex-col gap-10">
        
        {/* Header / Summary Bar */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>Trading Journal</h1>
            <p className="text-[#94a3b8]">A chronological record of closed positions and realized outcomes.</p>
          </div>
          
          <div className="flex items-center gap-6 p-4 rounded-xl border border-[rgba(255,255,255,0.06)]" style={{ backgroundColor: '#0d1623' }}>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs uppercase tracking-wider text-[#64748b] font-medium">Total Realized P&L</span>
              <span className="text-2xl font-semibold" style={{ color: summary.total_realized_pnl >= 0 ? '#4ade80' : '#f87171' }}>
                {formatCurrency(summary.total_realized_pnl)}
              </span>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.06)]" />
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs uppercase tracking-wider text-[#64748b] font-medium">Win Rate</span>
              <span className="text-2xl text-white font-medium">{summary.win_rate}%</span>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.06)]" />
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs uppercase tracking-wider text-[#64748b] font-medium">Avg Holding Period</span>
              <span className="text-2xl text-white font-medium">{summary.avg_hold} days</span>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.06)]" />
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs uppercase tracking-wider text-[#64748b] font-medium">Best Trade</span>
              <span className="text-2xl text-white font-medium flex items-baseline gap-2">
                {summary.best.symbol}
                <span className="text-sm font-normal" style={{ color: '#4ade80' }}>+{summary.best.realized_pnl_pct}%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Feed */}
        <div className="relative pl-6">
          {/* Main timeline axis */}
          <div className="absolute top-0 bottom-0 left-[23px] w-px bg-gradient-to-b from-[rgba(255,255,255,0.1)] to-transparent" />
          
          <div className="flex flex-col gap-12">
            {mockTrades.map((trade, i) => {
              const isWin = trade.realized_pnl >= 0;
              const color = isWin ? '#4ade80' : '#f87171';
              
              return (
                <div key={i} className="relative flex flex-col gap-3">
                  {/* Timeline dot */}
                  <div 
                    className="absolute -left-6 top-1.5 w-[7px] h-[7px] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)] ring-4 ring-[#080c13]"
                    style={{ backgroundColor: color }}
                  />

                  {/* Date Stamp */}
                  <div className="flex items-center gap-2 mb-1 pl-4">
                    <span className="text-sm tracking-wide" style={{ color: '#d97706' }}>{formatDate(trade.exit_date)}</span>
                  </div>

                  {/* Journal Card */}
                  <div 
                    className="flex flex-row items-center p-5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm hover:border-[rgba(255,255,255,0.1)] transition-colors duration-300 ml-4"
                    style={{ backgroundColor: 'rgba(13, 22, 35, 0.7)' }}
                  >
                    {/* Left Column: Ticker & Meta */}
                    <div className="flex flex-col w-[25%] pr-6 border-r border-[rgba(255,255,255,0.04)]">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold tracking-tight text-white">{trade.symbol}</span>
                        <span 
                          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
                          style={{ 
                            backgroundColor: trade.sell_type === 'full' ? 'rgba(255,255,255,0.05)' : 'rgba(92, 200, 240, 0.1)',
                            color: trade.sell_type === 'full' ? '#94a3b8' : '#5cc8f0',
                            borderColor: trade.sell_type === 'full' ? 'rgba(255,255,255,0.1)' : 'rgba(92, 200, 240, 0.2)'
                          }}
                        >
                          {trade.sell_type === 'full' ? 'Full Close' : 'Trim'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-[#94a3b8]">
                        <span className="flex items-center gap-1.5">
                          <Activity size={14} className="opacity-70" />
                          {trade.shares} shares
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="opacity-70" />
                          Held {getNaturalDuration(trade.holding_period_days)}
                        </span>
                      </div>
                    </div>

                    {/* Center Column: Price Journey */}
                    <div className="flex flex-row items-center justify-center gap-8 w-[50%] px-6 border-r border-[rgba(255,255,255,0.04)]">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-[#64748b] uppercase tracking-wider mb-1">Entry</span>
                        <span className="text-lg font-medium text-white">${trade.avg_entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-px relative flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                          <ArrowRight size={14} style={{ color: color }} className="absolute bg-[#0d1623] px-0.5" />
                        </div>
                      </div>

                      <div className="flex flex-col items-start">
                        <span className="text-xs text-[#64748b] uppercase tracking-wider mb-1">Exit</span>
                        <span className="text-lg font-medium" style={{ color: color }}>${trade.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Right Column: P&L */}
                    <div className="flex flex-col items-end w-[25%] pl-6">
                      <div className="flex items-center gap-2">
                        {isWin ? <TrendingUp size={20} style={{ color: color }} /> : <TrendingDown size={20} style={{ color: color }} />}
                        <span className="text-3xl font-semibold tracking-tight" style={{ color: color }}>
                          {formatCurrency(trade.realized_pnl)}
                        </span>
                      </div>
                      <span className="text-sm font-medium mt-1" style={{ color: color }}>
                        {isWin ? '+' : ''}{trade.realized_pnl_pct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* End marker */}
          <div className="absolute -left-[27px] bottom-0 w-3 h-3 rounded-full border-2 border-[rgba(255,255,255,0.2)] bg-[#080c13]" />
        </div>
      </div>
    </div>
  );
}

export default TradeJournalTimeline;
