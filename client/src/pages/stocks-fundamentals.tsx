import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ExternalLink } from "lucide-react";
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

export default function StocksFundamentalsPage() {
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
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 blur-3xl -z-10"></div>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300">
                <img src={stonksIcon} alt="Fundamentals" className="w-full h-full object-cover" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent">Fundamentals</h2>
            <Badge className="bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-white border-cyan-400/50 text-sm px-4 py-1 mb-4">FUNDAMENTAL ANALYSIS</Badge>
            <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full mb-4"></div>
            <p className="text-lg text-white/80">AI-powered fundamental analysis and financial insights</p>
          </div>

          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Fiscal.ai</h3>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">AI ANALYTICS</Badge>
              </div>
              <button onClick={() => openInNewTab('https://fiscal.ai/dashboard/7b99775e-bf9c-4b18-85a8-7a62cd29a52b/')} className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Open Full View
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://fiscal.ai/dashboard/7b99775e-bf9c-4b18-85a8-7a62cd29a52b/"
                className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                title="Fiscal.ai Dashboard"
                frameBorder="0"
                loading="eager"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
              />
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
