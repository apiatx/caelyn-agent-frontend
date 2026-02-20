import caelynLogo from "@assets/image_1771574443991.png";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import { useScrollFade } from "@/hooks/useScrollFade";
import { Card } from "@/components/ui/card";
import { Gamepad2, ExternalLink } from "lucide-react";
import { openSecureLink } from "@/utils/security";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-xl bg-gradient-to-br from-black/80 via-gray-900/60 to-black/90 border border-white/30 shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500 ${className}`}>
    {children}
  </Card>
);

export default function P2EPage() {
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">Play-to-Earn Gaming</h1>
              <p className="text-sm sm:text-base text-white/70 font-medium mt-1">Discover trending blockchain games and P2E opportunities</p>
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
        <div className="space-y-8">
          {/* Play-to-Earn Gaming Hub */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden mb-6">
              <iframe
                src="https://playtoearn.com/trending-blockchaingames"
                className="w-full h-[700px] border-0"
                title="PlayToEarn Trending Blockchain Games"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                data-testid="iframe-playtoearn"
              />
            </div>

            {/* Enhanced Link Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => openSecureLink('https://chainplay.gg/')}
                className="p-4 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 hover:from-blue-500/25 hover:to-cyan-500/25 border border-blue-500/30 hover:border-blue-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 transform"
                data-testid="button-chainplay"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                      <Gamepad2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-blue-300 font-bold text-base">ChainPlay Gaming Hub</h4>
                      <p className="text-blue-400/70 text-xs">Discover and track blockchain games</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                </div>
              </button>

              <button
                onClick={() => openSecureLink('https://dappradar.com/blog/category/games')}
                className="p-4 bg-gradient-to-br from-purple-500/15 to-pink-500/15 hover:from-purple-500/25 hover:to-pink-500/25 border border-purple-500/30 hover:border-purple-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-500/20 transform"
                data-testid="button-dappradar"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                      <Gamepad2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-purple-300 font-bold text-base">P2E Gaming News & Insights</h4>
                      <p className="text-purple-400/70 text-xs">DappRadar Games Blog</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-purple-400 flex-shrink-0" />
                </div>
              </button>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
