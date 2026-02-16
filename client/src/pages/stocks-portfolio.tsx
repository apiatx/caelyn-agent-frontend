import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Briefcase } from "lucide-react";


const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function StocksPortfolioPage() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-4 lg:space-y-8">
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Portfolio</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">PORTFOLIO</Badge>
              </div>
              <button onClick={() => openInNewTab('https://finance.yahoo.com/portfolios')} className="text-green-400 hover:text-green-300 text-xs sm:text-sm flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Open Full View
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={() => openInNewTab('https://finance.yahoo.com/portfolios')} className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border border-yellow-500/20 hover:border-yellow-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
                <div className="text-sm font-medium text-white group-hover:text-yellow-300 mb-1">Yahoo Finance Portfolios</div>
                <div className="text-xs text-crypto-silver">Portfolio tracking and analysis</div>
              </button>

              <button onClick={() => openInNewTab('https://snowball-analytics.com/dashboard')} className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 hover:from-cyan-500/20 hover:to-cyan-600/20 border border-cyan-500/20 hover:border-cyan-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
                <div className="text-sm font-medium text-white group-hover:text-cyan-300 mb-1">Snowball Analytics</div>
                <div className="text-xs text-crypto-silver">Portfolio dashboard and analytics</div>
              </button>
              
              <button onClick={() => openInNewTab('https://simplywall.st/portfolio/65b1f9ab-7fa4-4d25-95c6-b8fa93d94d77/holdings')} className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
                <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">Simply Wall St - Portfolio Analytics</div>
                <div className="text-xs text-crypto-silver">Portfolio analysis and stock insights</div>
              </button>
              
              <button onClick={() => openInNewTab('https://client.schwab.com/clientapps/accounts/summary/')} className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
                <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Charles Schwab</div>
                <div className="text-xs text-crypto-silver">Investment account dashboard</div>
              </button>
              
              <button onClick={() => openInNewTab('https://robinhood.com/us/en/')} className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20 border border-emerald-500/20 hover:border-emerald-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
                <div className="text-sm font-medium text-white group-hover:text-emerald-300 mb-1">Robinhood</div>
                <div className="text-xs text-crypto-silver">Commission-free trading platform</div>
              </button>
              
              <button onClick={() => openInNewTab('https://home.personalcapital.com/page/login/app#/dashboard')} className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
                <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Empower Net Worth</div>
                <div className="text-xs text-crypto-silver">Net worth tracking and financial planning</div>
              </button>
            </div>
          </GlassCard>

        </div>
      </main>
    </div>
  );
}
