import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ExternalLink, BarChart3 } from "lucide-react";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import stonksIcon from "@assets/download (2)_1757104529784.jpeg";
import { useScrollFade } from "@/hooks/useScrollFade";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function StocksSectorsPage() {
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
        <div className="absolute inset-0 opacity-75" style={{ backgroundImage: `url(${newHeaderBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="relative z-10 max-w-[95vw] mx-auto px-2 sm:px-3">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-lg">
                <img src={cryptoHippoImage} alt="CryptoHippo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white drop-shadow-lg">CryptoHippo</h1>
            </div>
            <div className="hidden sm:flex items-center">
              <img src={criptomonedas} alt="Crypto Coins" className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-lg" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-4 lg:space-y-8">
          <div className="text-center relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 blur-3xl -z-10"></div>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300">
                <img src={stonksIcon} alt="Sectors" className="w-full h-full object-cover" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-300 to-orange-400 bg-clip-text text-transparent">Sectors + ETFs</h2>
            <Badge className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white border-purple-400/50 text-sm px-4 py-1 mb-4">SECTORS & FUNDS</Badge>
            <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full mb-4"></div>
            <p className="text-lg text-white/80">Sector analysis, bubbles visualization, and ETF research</p>
          </div>

          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Banterbubbles</h3>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">STOCK BUBBLES</Badge>
              </div>
              <button onClick={() => openInNewTab('https://banterbubbles.com/?utm_source=cbanter&utm_medium=cbanter&utm_campaign=cbanter&source=cbanter#stocks')} className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Open Full View
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://banterbubbles.com/?utm_source=cbanter&utm_medium=cbanter&utm_campaign=cbanter&source=cbanter#stocks"
                className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                title="Banterbubbles Stock Analysis"
                frameBorder="0"
                loading="eager"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
              />
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Stage Analysis Screener</h3>
                <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-crypto-silver/30 text-xs">SECTORS & FUNDS</Badge>
              </div>
              <button onClick={() => openInNewTab('https://screener.nextbigtrade.com/#/markets')} className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Open Full View
              </button>
            </div>

            <div className="w-full space-y-6">
              <iframe
                src="https://screener.nextbigtrade.com/#/markets"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                title="Next Big Trade Sectors Screener"
                loading="eager"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
                frameBorder="0"
              />
              
              <button
                onClick={() => openInNewTab('https://www.ssga.com/us/en/institutional/resources/sector-tracker#currentTab=dayOne&fundTicker=xle')}
                className="w-full bg-gradient-to-br from-yellow-500/10 to-amber-600/10 hover:from-yellow-500/20 hover:to-amber-600/20 border border-yellow-500/20 hover:border-yellow-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-yellow-300 mb-1">SPDR Sector Tracker</div>
                <div className="text-xs text-crypto-silver">State Street sector performance and ETF analysis</div>
              </button>
              
              <button
                onClick={() => openInNewTab('https://www.slickcharts.com/')}
                className="w-full bg-gradient-to-br from-blue-500/10 to-cyan-600/10 hover:from-blue-500/20 hover:to-cyan-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">SlickCharts Indices</div>
                <div className="text-xs text-crypto-silver">Stock market indices and data</div>
              </button>
              
              <button
                onClick={() => openInNewTab('https://www.etf.com/')}
                className="w-full bg-gradient-to-br from-green-500/10 to-emerald-600/10 hover:from-green-500/20 hover:to-emerald-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">ETF.com</div>
                <div className="text-xs text-crypto-silver">ETF research, news and analysis</div>
              </button>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
