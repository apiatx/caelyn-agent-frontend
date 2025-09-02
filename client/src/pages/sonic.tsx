import { Suspense } from "react";
import { UniversalNavigation } from "@/components/universal-navigation";
import { Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { openSecureLink } from "@/utils/security";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
import { useScrollFade } from "@/hooks/useScrollFade";

// Glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function SonicPage() {
  const headerOpacity = useScrollFade(30, 120);

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
      <UniversalNavigation activePage="sonic" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center py-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                S (Sonic) Ecosystem
              </h2>
            </div>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              High-performance blockchain platform with revolutionary consensus and scalability
            </p>
          </div>

          {/* Core Infrastructure */}
          <GlassCard className="p-6">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-400 rounded-full"></div>
              Core Infrastructure
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => openSecureLink('https://soniclabs.com/')}
                className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-blue-400" />
                  <h4 className="text-blue-400 font-semibold">Sonic Labs</h4>
                </div>
                <p className="text-gray-400 text-sm">Official Sonic platform</p>
              </button>

              <button
                onClick={() => openSecureLink('https://explorer.sonic.game/')}
                className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-purple-400" />
                  <h4 className="text-purple-400 font-semibold">Sonic Explorer</h4>
                </div>
                <p className="text-gray-400 text-sm">Network explorer</p>
              </button>

              <button
                onClick={() => openSecureLink('https://docs.sonic.game/')}
                className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-green-400" />
                  <h4 className="text-green-400 font-semibold">Developer Docs</h4>
                </div>
                <p className="text-gray-400 text-sm">Technical documentation</p>
              </button>
            </div>
          </GlassCard>

          {/* DeFi & Trading */}
          <GlassCard className="p-6">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-400 rounded-full"></div>
              DeFi & Trading
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => openSecureLink('https://app.sonic.game/swap')}
                className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-blue-400" />
                  <h4 className="text-blue-400 font-semibold">Sonic Swap</h4>
                </div>
                <p className="text-gray-400 text-sm">Native DEX on Sonic</p>
              </button>

              <button
                onClick={() => openSecureLink('https://bridge.sonic.game/')}
                className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-orange-400" />
                  <h4 className="text-orange-400 font-semibold">Sonic Bridge</h4>
                </div>
                <p className="text-gray-400 text-sm">Cross-chain bridge</p>
              </button>

              <button
                onClick={() => openSecureLink('https://wallet.sonic.game/')}
                className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-green-400" />
                  <h4 className="text-green-400 font-semibold">Sonic Wallet</h4>
                </div>
                <p className="text-gray-400 text-sm">Official wallet</p>
              </button>
            </div>
          </GlassCard>

          {/* Gaming & NFTs */}
          <GlassCard className="p-6">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-6 h-6 bg-pink-400 rounded-full"></div>
              Gaming & NFTs
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => openSecureLink('https://games.sonic.game/')}
                className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-pink-400" />
                  <h4 className="text-pink-400 font-semibold">Sonic Games</h4>
                </div>
                <p className="text-gray-400 text-sm">Gaming ecosystem</p>
              </button>

              <button
                onClick={() => openSecureLink('https://nft.sonic.game/')}
                className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-indigo-400 font-semibold">Sonic NFT</h4>
                </div>
                <p className="text-gray-400 text-sm">NFT marketplace</p>
              </button>

              <button
                onClick={() => openSecureLink('https://arcade.sonic.game/')}
                className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-cyan-400 font-semibold">Sonic Arcade</h4>
                </div>
                <p className="text-gray-400 text-sm">Gaming platform</p>
              </button>
            </div>
          </GlassCard>

          {/* Ecosystem & Tools */}
          <GlassCard className="p-6">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-400 rounded-full"></div>
              Ecosystem & Tools
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => openSecureLink('https://analytics.sonic.game/')}
                className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-yellow-400 font-semibold">Sonic Analytics</h4>
                </div>
                <p className="text-gray-400 text-sm">Network metrics</p>
              </button>

              <button
                onClick={() => openSecureLink('https://coingecko.com/en/coins/sonic')}
                className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-green-400" />
                  <h4 className="text-green-400 font-semibold">S Price</h4>
                </div>
                <p className="text-gray-400 text-sm">Live price & market data</p>
              </button>

              <button
                onClick={() => openSecureLink('https://ecosystem.sonic.game/')}
                className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-blue-400" />
                  <h4 className="text-blue-400 font-semibold">Ecosystem Directory</h4>
                </div>
                <p className="text-gray-400 text-sm">All Sonic projects</p>
              </button>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}