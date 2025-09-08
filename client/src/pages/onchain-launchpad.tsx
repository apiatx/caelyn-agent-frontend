import { UniversalNavigation } from "@/components/universal-navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, ExternalLink, Coins, Zap } from "lucide-react";
import { openSecureLink } from "@/utils/security";
import { useScrollFade } from "@/hooks/useScrollFade";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";

// Safe components for external links
const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function OnchainLaunchpadPage() {
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
            backgroundImage: `url(${newHeaderBackground})`,
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
            {/* Top-right crypto image */}
            <div className="hidden sm:flex items-center">
              <img 
                src={criptomonedas}
                alt="Crypto Coins"
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-lg"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="onchain-launchpad" />

      {/* Launchpad Section - Enhanced Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-indigo-500/20 blur-3xl -z-10"></div>
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300 bg-gradient-to-r from-purple-500/40 to-blue-500/40">
              <Rocket className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">Launchpad</h2>
          </div>
          <p className="text-lg text-white/80 font-medium tracking-wide">Token Launches & IDOs</p>
          <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ETH Section */}
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">ETH</h3>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">ETHEREUM ECOSYSTEM</Badge>
            </div>
          </div>
          
          {/* ETH Launchpad Platforms */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Ethereum Launchpads</h4>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Access premier Ethereum-based token launches, IDOs, and early investment opportunities.
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://dao.maker/')}
                  className="w-full bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 text-white text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  DAO Maker
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://launchpad.ethereum.org/')}
                  className="w-full bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 text-white text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ethereum Launchpad
                </Button>
              </div>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Pinksale</h4>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Decentralized launchpad for fair token launches and presales on Ethereum.
              </p>
              <Button
                variant="outline"
                onClick={() => openInNewTab('https://www.pinksale.finance/')}
                className="w-full bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 text-white text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Pinksale
              </Button>
            </div>

            <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Seedify</h4>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Premium gaming and NFT launchpad with tier-based access system.
              </p>
              <Button
                variant="outline"
                onClick={() => openInNewTab('https://launchpad.seedify.fund/')}
                className="w-full bg-indigo-500/20 border-indigo-500/30 hover:bg-indigo-500/30 text-white text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Seedify
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* SOL Section */}
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">SOL</h3>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">SOLANA ECOSYSTEM</Badge>
            </div>
          </div>
          
          {/* SOL Launchpad Platforms */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Solana Launchpads</h4>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                High-speed, low-cost token launches on the Solana blockchain ecosystem.
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://solanium.io/')}
                  className="w-full bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 text-white text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Solanium
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://www.apexit.io/')}
                  className="w-full bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 text-white text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apexit
                </Button>
              </div>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-pink-500/10 to-red-500/10 border border-pink-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">AcceleRaytor</h4>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Raydium's launchpad for Solana-based projects and token launches.
              </p>
              <Button
                variant="outline"
                onClick={() => openInNewTab('https://raydium.io/acceleraytor/')}
                className="w-full bg-pink-500/20 border-pink-500/30 hover:bg-pink-500/30 text-white text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open AcceleRaytor
              </Button>
            </div>

            <div className="p-6 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Magic Eden</h4>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Leading Solana NFT marketplace with integrated launchpad features.
              </p>
              <Button
                variant="outline"
                onClick={() => openInNewTab('https://magiceden.io/launchpad')}
                className="w-full bg-orange-500/20 border-orange-500/30 hover:bg-orange-500/30 text-white text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Magic Eden
              </Button>
            </div>
          </div>
        </GlassCard>

      </main>
    </div>
  );
}