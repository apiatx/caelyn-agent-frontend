import { GlassCard } from "@/components/ui/glass-card";
import caelynLogo from "@assets/image_1771574443991.png";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import { useScrollFade } from "@/hooks/useScrollFade";
import { ExternalLink } from "lucide-react";

export default function OnchainAirdropPage() {
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">Airdrop</h1>
              <p className="text-sm sm:text-base text-white/70 font-medium mt-1">Track and discover crypto airdrops</p>
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
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <GlassCard className="p-6">

          <div className="flex justify-end mb-3">
            <a
              href="https://www.alphadrops.net/alpha"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
              data-testid="button-alphadrops-fullview"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://www.alphadrops.net/alpha"
              className="w-full h-[700px] border-0"
              title="AlphaDrops - Crypto Airdrops"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              data-testid="iframe-alphadrops"
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              AlphaDrops • Discover and track cryptocurrency airdrops
            </p>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
