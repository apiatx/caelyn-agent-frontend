import React from "react";
import { TrendingUp, TrendingDown, Clock, Award, AlertTriangle, ArrowRightLeft } from "lucide-react";

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
  best_pnl_pct: { symbol: "NVDA", realized_pnl_pct: 108.3 },
  worst_pnl_pct: { symbol: "COIN", realized_pnl_pct: -19.3 },
  avg_holding_period_days: 87,
};

function DonutChart({ winRate }: { winRate: number }) {
  const radius = 80;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const winDasharray = (winRate / 100) * circumference;
  const lossDasharray = circumference - winDasharray;

  return (
    <div className="relative flex flex-col items-center justify-center w-[200px] h-[200px]">
      {/* Background glow */}
      <div className="absolute inset-0 rounded-full blur-[40px] opacity-20 bg-gradient-to-tr from-[#a78bfa] to-[#5cc8f0]"></div>
      
      <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#0d1623"
          strokeWidth={strokeWidth}
        />
        {/* Loss segment (Red) */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#f87171"
          strokeWidth={strokeWidth}
          strokeDasharray={`${lossDasharray} ${winDasharray}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          className="drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]"
        />
        {/* Win segment (Green) */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#4ade80"
          strokeWidth={strokeWidth}
          strokeDasharray={`${winDasharray} ${lossDasharray}`}
          strokeDashoffset={-lossDasharray}
          strokeLinecap="round"
          className="drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight text-[#e2e8f0]">{winRate}%</span>
        <span className="text-xs uppercase tracking-wider font-semibold text-[#94a3b8] mt-1">Win Rate</span>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, icon: Icon, isPositive }: any) {
  return (
    <div className="bg-[#0d1623] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 flex flex-col justify-between h-[120px] transition-colors hover:border-[rgba(255,255,255,0.1)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#94a3b8]">{title}</span>
        <div className={`p-2 rounded-lg ${isPositive === true ? 'bg-[#4ade80]/10 text-[#4ade80]' : isPositive === false ? 'bg-[#f87171]/10 text-[#f87171]' : 'bg-[rgba(255,255,255,0.05)] text-[#a78bfa]'}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${isPositive === true ? 'text-[#4ade80]' : isPositive === false ? 'text-[#f87171]' : 'text-[#e2e8f0]'}`}>
          {value}
        </span>
        {subValue && (
          <span className="text-sm text-[#64748b]">{subValue}</span>
        )}
      </div>
    </div>
  );
}

function ContributionChart() {
  const maxPnl = Math.max(...mockTrades.map(t => Math.abs(t.realized_pnl)));
  
  return (
    <div className="bg-[#0d1623] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 flex flex-col w-full h-full">
      <h3 className="text-sm font-medium text-[#94a3b8] mb-6 flex items-center gap-2">
        <ArrowRightLeft size={16} />
        P&L Contribution by Ticker
      </h3>
      
      <div className="flex-1 flex flex-col justify-between gap-3 relative">
        {/* Center zero line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[rgba(255,255,255,0.1)] z-0"></div>
        
        {mockTrades.sort((a,b) => b.realized_pnl - a.realized_pnl).map(trade => {
          const isWin = trade.realized_pnl > 0;
          const width = (Math.abs(trade.realized_pnl) / maxPnl) * 50; // 50% max width each side
          
          return (
            <div key={trade.symbol} className="flex items-center relative z-10 w-full text-xs">
              <div className="w-1/2 pr-3 flex justify-end items-center">
                {!isWin && (
                  <div className="flex items-center justify-end w-full">
                    <span className="text-[#f87171] mr-2 opacity-80 whitespace-nowrap hidden sm:inline-block">-${Math.abs(trade.realized_pnl)}</span>
                    <div 
                      className="h-4 bg-gradient-to-l from-[#f87171]/80 to-[#f87171]/40 rounded-l-sm" 
                      style={{ width: `${width}%` }}
                    ></div>
                  </div>
                )}
                <span className={`font-mono text-[#94a3b8] ${isWin ? 'mr-0' : 'mr-4 absolute left-4'}`}>{trade.symbol}</span>
              </div>
              <div className="w-1/2 pl-3 flex items-center">
                {isWin && (
                  <div className="flex items-center w-full">
                    <div 
                      className="h-4 bg-gradient-to-r from-[#4ade80]/80 to-[#4ade80]/40 rounded-r-sm" 
                      style={{ width: `${width}%` }}
                    ></div>
                    <span className="text-[#4ade80] ml-2 opacity-80 whitespace-nowrap hidden sm:inline-block">+${trade.realized_pnl}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PnLScorecard() {
  return (
    <div className="min-h-screen p-6 bg-[#080c13] text-[#e2e8f0] font-sans overflow-y-auto" style={{ width: '1100px', margin: '0 auto' }}>
      <div className="max-w-[1000px] mx-auto space-y-6">
        
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            Performance Scorecard
            <span className="px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-xs font-medium text-[#94a3b8]">
              Closed Trades
            </span>
          </h1>
          <p className="text-sm text-[#64748b] mt-2">Comprehensive analysis of your realized returns and win rate.</p>
        </header>

        {/* Top Analytics Section */}
        <section className="grid grid-cols-12 gap-6 h-[400px]">
          {/* Main Chart Area */}
          <div className="col-span-12 lg:col-span-8 bg-[#0d1623] border border-[rgba(255,255,255,0.06)] rounded-3xl p-8 relative overflow-hidden flex items-center justify-around">
            
            <div className="grid grid-cols-2 gap-4 w-1/3">
              <StatCard 
                title="Total Realized P&L" 
                value="+$7,260" 
                icon={TrendingUp} 
                isPositive={true} 
              />
              <StatCard 
                title="Avg Hold Time" 
                value="87" 
                subValue="days"
                icon={Clock} 
              />
            </div>
            
            <div className="flex-shrink-0 z-10 mx-8">
              <DonutChart winRate={summary.win_rate} />
            </div>

            <div className="grid grid-cols-2 gap-4 w-1/3">
              <StatCard 
                title="Best Trade" 
                value="NVDA" 
                subValue="+108.3%"
                icon={Award} 
                isPositive={true}
              />
              <StatCard 
                title="Worst Trade" 
                value="COIN" 
                subValue="-19.3%"
                icon={AlertTriangle} 
                isPositive={false}
              />
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="col-span-12 lg:col-span-4 h-full">
            <ContributionChart />
          </div>
        </section>

        {/* Bottom Ledger Section */}
        <section className="mt-8">
          <h2 className="text-lg font-medium text-[#e2e8f0] mb-4">Trade Ledger</h2>
          
          <div className="bg-[#0d1623] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#64748b] uppercase bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.06)]">
                <tr>
                  <th className="px-6 py-4 font-medium">Asset</th>
                  <th className="px-6 py-4 font-medium">Exit Date</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium text-right">Hold Period</th>
                  <th className="px-6 py-4 font-medium text-right">Realized P&L ($)</th>
                  <th className="px-6 py-4 font-medium text-right">Return (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.03)]">
                {mockTrades.sort((a,b) => new Date(b.exit_date).getTime() - new Date(a.exit_date).getTime()).map((trade, i) => {
                  const isWin = trade.realized_pnl > 0;
                  return (
                    <tr key={i} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                      <td className="px-6 py-4 font-mono font-medium text-white flex items-center gap-2">
                        {trade.symbol}
                      </td>
                      <td className="px-6 py-4 text-[#94a3b8]">{trade.exit_date}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-1 rounded-sm uppercase tracking-wider font-semibold ${trade.sell_type === 'full' ? 'bg-[#a78bfa]/10 text-[#a78bfa]' : 'bg-[rgba(255,255,255,0.1)] text-[#94a3b8]'}`}>
                          {trade.sell_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[#94a3b8]">{trade.holding_period_days}d</td>
                      <td className={`px-6 py-4 text-right font-medium ${isWin ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                        {isWin ? '+' : '-'}${Math.abs(trade.realized_pnl).toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${isWin ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                        {isWin ? '+' : ''}{trade.realized_pnl_pct}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}

export default PnLScorecard;
