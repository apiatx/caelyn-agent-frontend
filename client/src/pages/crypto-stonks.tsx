import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bitcoin, TrendingUp, Brain, ExternalLink } from "lucide-react";
import chartIcon from "@assets/images_1757104413238.png";
import caelynLogo from "@assets/image_1771574443991.png";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">Crypto Treasuries</h1>
              <p className="text-sm sm:text-base text-white/70 font-medium mt-1">Track corporate Bitcoin treasuries and crypto adoption by public companies</p>
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
        <div className="space-y-6">
          {/* Crypto Treasuries */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">

            <div className="space-y-6">
              {/* Treasuries and ETFs - Artemis */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-2.5 h-2.5 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-emerald-400">Treasuries and ETFs</h4>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                      ARTEMIS
                    </Badge>
                  </div>
                  <button
                    onClick={() => openInNewTab('https://app.artemisanalytics.com/digital-asset-treasuries')}
                    className="text-emerald-400 hover:text-emerald-300 text-xs sm:text-sm"
                  >
                    Open Full View →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://app.artemisanalytics.com/digital-asset-treasuries"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Artemis Digital Asset Treasuries"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
                <button
                  onClick={() => openInNewTab('https://blockworks.com/analytics/treasury-companies')}
                  className="w-full bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-500/90 hover:to-purple-500/90 border border-indigo-400/30 hover:border-indigo-300/50 rounded-lg p-4 transition-all duration-300 group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div className="text-left">
                      <div className="text-base font-bold text-white group-hover:text-indigo-100">Blockworks Treasury Analytics</div>
                      <div className="text-xs text-white/60 group-hover:text-white/80">Corporate treasury companies & ETF holdings</div>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-white/50 group-hover:text-white/80 transition-colors" />
                </button>
              </div>

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

            </div>
          </GlassCard>

        </div>
      </main>
    </div>
  );
}