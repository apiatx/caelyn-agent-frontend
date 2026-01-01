import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import { useScrollFade } from "@/hooks/useScrollFade";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, BarChart3, Layers } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function SectorsEtfsPage() {
  const headerOpacity = useScrollFade(30, 120);

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      <header 
        className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300 relative overflow-hidden" 
        style={{ opacity: headerOpacity, pointerEvents: headerOpacity < 0.1 ? 'none' : 'auto' }}
      >
        <div 
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage: `url(${newHeaderBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
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

      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-6">
          <div className="text-center relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-indigo-500/20 blur-3xl -z-10"></div>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300 bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <Layers className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent">Sectors + ETFs</h2>
                <Badge className="bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white border-purple-400/50 text-sm mt-2 px-3 py-1">
                  MARKET SECTORS
                </Badge>
              </div>
            </div>
            <p className="text-lg text-white/80 font-medium tracking-wide">Exchange-traded funds and market sector analysis</p>
            <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4 rounded-full"></div>
          </div>

          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Seeking Alpha ETFs</h3>
                <Badge className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-white border-crypto-silver/30 text-xs">
                  ETF TABLES
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://seekingalpha.com/etfs-and-funds/etf-tables/key_markets')}
                className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open Full View
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://seekingalpha.com/etfs-and-funds/etf-tables/key_markets"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                title="Seeking Alpha ETF Tables"
                loading="eager"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
                frameBorder="0"
              />
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">SlickCharts</h3>
                <Badge className="bg-gradient-to-r from-green-500/20 to-blue-500/20 text-white border-crypto-silver/30 text-xs">
                  INDICES
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://www.slickcharts.com/')}
                className="text-green-400 hover:text-green-300 text-xs sm:text-sm flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open Full View
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://www.slickcharts.com/"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                title="SlickCharts Stock Market Data"
                loading="eager"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
                frameBorder="0"
              />
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Sprott ETFs</h3>
                <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-white border-crypto-silver/30 text-xs">
                  PRECIOUS METALS
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://sprottetfs.com/')}
                className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open Full View
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://sprottetfs.com/"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                title="Sprott ETFs"
                loading="eager"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
                frameBorder="0"
              />
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">ETF.com</h3>
                <Badge className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-white border-crypto-silver/30 text-xs">
                  ETF DATABASE
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://www.etf.com/')}
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open Full View
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://www.etf.com/"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                title="ETF.com Database"
                loading="eager"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
                frameBorder="0"
              />
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
