import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, ExternalLink, Coins, Zap } from "lucide-react";
import { openSecureLink } from "@/utils/security";
import { useScrollFade } from "@/hooks/useScrollFade";
import caelynLogo from "@assets/image_1771574443991.png";
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
        style={{ opacity: headerOpacity, pointerEvents: headerOpacity < 0.1 ? 'none' : 'auto' }}
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
          <div className="flex items-center justify-center py-3 lg:py-4">
            <img 
              src={caelynLogo}
              alt="Caelyn.ai"
              style={{ width: 220, height: 'auto', objectFit: 'contain' }}
            />
            <div className="text-center flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">Launchpad</h1>
              <p className="text-sm sm:text-base text-white/70 font-medium mt-1">Token Launches & IDOs</p>
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


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* CoinLaunch Launchpads */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">CoinLaunch Launchpads</h3>
            </div>
            <Button
              onClick={() => openInNewTab('https://coinlaunch.space/launchpads/')}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Full View
            </Button>
          </div>
          <iframe
            src="https://coinlaunch.space/launchpads/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="CoinLaunch Launchpads"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </GlassCard>

        {/* 3. ChainBroker Platforms */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">ChainBroker Platforms</h3>
            </div>
            <Button
              onClick={() => openInNewTab('https://chainbroker.io/platforms/')}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Full View
            </Button>
          </div>
          <iframe
            src="https://chainbroker.io/platforms/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="ChainBroker Platforms"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </GlassCard>

        {/* 4. CoinGecko Launchpad - Button Only */}
        <GlassCard className="p-6">
          <div className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">CoinGecko Launchpad</h3>
            </div>
            <Button
              onClick={() => openInNewTab('https://www.coingecko.com/en/categories/launchpad')}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              <ExternalLink className="w-5 h-5" />
              Open CoinGecko Launchpad
            </Button>
          </div>
        </GlassCard>

        {/* 5. Utility Section */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-slate-500 rounded-full flex items-center justify-center">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Utility</h3>
            </div>
            <Button
              onClick={() => openInNewTab('https://proofplatform.io/projects')}
              className="bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Full View
            </Button>
          </div>
          <iframe
            src="https://proofplatform.io/projects"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="ProofPlatform Projects"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
          />
          
          {/* Believe.app Button */}
          <div className="text-center mt-6">
            <Button
              onClick={() => openInNewTab('https://believe.app/auth')}
              className="bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              <ExternalLink className="w-5 h-5" />
              Open Believe.app
            </Button>
          </div>
        </GlassCard>

        {/* 6. Trenches Section */}
        <GlassCard className="p-6">
          <div className="text-center">
            <div className="flex justify-center items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Trenches</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => openInNewTab('https://pump.fun')}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Open Pump.fun
              </Button>
              
              <Button
                onClick={() => openInNewTab('https://bonk.fun')}
                className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Open Bonk.fun
              </Button>
              
              <Button
                onClick={() => openInNewTab('https://www.hyperliquid.magpiexyz.io/meme')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Open Hyperpie
              </Button>
            </div>
          </div>
        </GlassCard>

      </main>
    </div>
  );
}