import { UniversalNavigation } from "@/components/universal-navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bitcoin, TrendingUp, Brain, ExternalLink } from "lucide-react";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
import chartIcon from "@assets/images_1757104413238.png";
import { useScrollFade } from "@/hooks/useScrollFade";

// Glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function CryptoStonksPage() {
  const headerOpacity = useScrollFade(30, 120);

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header 
        className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300 relative overflow-hidden" 
        style={{ opacity: headerOpacity }}
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage: `url(${paintColorsBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {/* Content Layer */}
        <div className="relative z-10 max-w-[95vw] mx-auto px-2 sm:px-3">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-lg">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white drop-shadow-lg">
                CryptoHippo
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="crypto-stonks" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden">
                <img 
                  src={chartIcon} 
                  alt="Chart Icon" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-3xl font-bold text-white">Crypto Stocks</h1>
            </div>
            <p className="text-crypto-silver">Track corporate Bitcoin treasuries and crypto adoption by public companies</p>
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
                    <h4 className="text-lg font-semibold text-blue-400">Strategic Ethereum Reserve</h4>
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
                    title="Strategic Ethereum Reserve"
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
                    <h4 className="text-lg font-semibold text-purple-400">SOL Treasuries</h4>
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
                          <h4 className="font-semibold text-purple-400 group-hover:text-purple-300">SOL Treasuries</h4>
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
                    <h4 className="text-lg font-semibold text-gray-300 bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">TAO Treasuries</h4>
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
                    title="TAO Treasuries"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* The Case for Bitcoin */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <Bitcoin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">The Case for Bitcoin</h3>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                  VANECK RESEARCH
                </Badge>
              </div>
            </div>

            <button
              onClick={() => openInNewTab('https://www.vaneck.com/us/en/blogs/digital-assets/the-investment-case-for-bitcoin/')}
              className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-6 transition-all duration-300 text-left group w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium text-white group-hover:text-orange-300 mb-2">VanEck: The Investment Case for Bitcoin</div>
                  <div className="text-sm text-crypto-silver">Comprehensive institutional research on Bitcoin as an investment asset</div>
                </div>
                <ExternalLink className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
              </div>
            </button>
          </GlassCard>

          {/* Tokenized Stocks */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Tokenized Stocks</h3>
                <Badge className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border-crypto-silver/30 text-xs">
                  BLOCKCHAIN STOCKS
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => openInNewTab('https://xstocks.com/us')}
                className="bg-gradient-to-br from-purple-500/10 to-blue-600/10 hover:from-purple-500/20 hover:to-blue-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">xStocks - Tokenized US Stocks</div>
                <div className="text-xs text-crypto-silver">Trade tokenized versions of US stocks on blockchain</div>
              </button>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}