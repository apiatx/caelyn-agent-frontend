import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bitcoin, TrendingUp, Brain, ExternalLink } from "lucide-react";
import chartIcon from "@assets/images_1757104413238.png";

// Glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function CryptoStonksPage() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="text-center relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20 blur-3xl -z-10"></div>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300">
                <img 
                  src={chartIcon} 
                  alt="Chart Icon" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-orange-100 to-amber-100 bg-clip-text text-transparent">Crypto Treasuries</h1>
                <Badge className="bg-gradient-to-r from-orange-500/30 to-amber-500/30 text-white border-orange-400/50 text-sm mt-2 px-3 py-1">
                  CORPORATE HOLDINGS
                </Badge>
              </div>
            </div>
            <p className="text-lg text-white/80 font-medium tracking-wide">Track corporate Bitcoin treasuries and crypto adoption by public companies</p>
            <div className="w-32 h-1 bg-gradient-to-r from-orange-500 to-amber-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Crypto Treasuries */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">

            <div className="space-y-6">
              {/* Bitcoin Treasuries */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                      <Bitcoin className="w-2.5 h-2.5 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-orange-400">Bitcoin Treasuries</h4>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                      BTC
                    </Badge>
                  </div>
                  <button
                    onClick={() => openInNewTab('https://bitcointreasuries.net/')}
                    className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
                  >
                    Open Full View →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://bitcointreasuries.net/"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Bitcoin Treasuries"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              </div>

              {/* Ethereum Reserve */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-2.5 h-2.5 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-blue-400">Ethereum Treasuries</h4>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      ETH
                    </Badge>
                  </div>
                  <button
                    onClick={() => openInNewTab('https://strategicethreserve.xyz/')}
                    className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                  >
                    Open Full View →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://strategicethreserve.xyz/"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Ethereum Treasuries"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              </div>

              {/* SOL Reserve */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">SOL</span>
                    </div>
                    <h4 className="text-lg font-semibold text-purple-400">Solana Treasuries</h4>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                      SOL
                    </Badge>
                  </div>
                  <button
                    onClick={() => openInNewTab('https://www.coingecko.com/en/treasuries/solana/companies')}
                    className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
                  >
                    Open Full View →
                  </button>
                </div>
                <div className="w-full">
                  <button
                    onClick={() => openInNewTab('https://www.coingecko.com/en/treasuries/solana/companies')}
                    className="w-full bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/30 rounded-lg p-4 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">SOL</span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-purple-400 group-hover:text-purple-300">Solana Treasuries</h4>
                          <p className="text-crypto-silver text-sm">Track Solana institutional adoption</p>
                        </div>
                      </div>
                      <ExternalLink className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    </div>
                  </button>
                </div>
              </div>

              {/* TAO Treasuries */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                      <Brain className="w-2.5 h-2.5 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-300 bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">Bittensor Treasuries</h4>
                    <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs">
                      TAO
                    </Badge>
                  </div>
                  <button
                    onClick={() => openInNewTab('https://taotreasuries.app/')}
                    className="text-gray-300 hover:text-gray-200 text-xs sm:text-sm"
                  >
                    Open Full View →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://taotreasuries.app/"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Bittensor Treasuries"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              </div>
            </div>
          </GlassCard>

        </div>
      </main>
    </div>
  );
}