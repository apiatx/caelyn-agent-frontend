import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import cryptoHippoWithBitcoin from "@assets/image_1758740882958.png";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import { useScrollFade } from "@/hooks/useScrollFade";
import TradingAgent from "@/components/TradingAgent";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

function TickerTapeWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
    containerRef.current.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;background:transparent;}</style></head><body><script type="module" src="https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js"><\/script><tv-ticker-tape symbols="FOREXCOM:SPXUSD,FOREXCOM:NSXUSD,FOREXCOM:DJI,FX:EURUSD,BITSTAMP:BTCUSD,BITSTAMP:ETHUSD,CMCMARKETS:GOLD,TVC:SILVER,TVC:DXY,CBOE:VIX,TVC:RUT" theme="dark" transparent style="width:100%;display:block;"></tv-ticker-tape></body></html>`);
      doc.close();
    }
    return () => {
      if (containerRef.current && iframe.parentNode === containerRef.current) {
        containerRef.current.removeChild(iframe);
      }
    };
  }, []);
  return <div ref={containerRef} className="w-full h-full" />;
}

export default function HippoAIPage() {
  const headerOpacity = useScrollFade(30, 120);

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      <header 
        className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300 relative overflow-hidden" 
        style={{ opacity: headerOpacity, pointerEvents: headerOpacity < 0.1 ? 'none' : 'auto' }}
      >
        <div className="absolute inset-0 opacity-75" style={{ backgroundImage: `url(${newHeaderBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="relative z-10 max-w-[95vw] mx-auto px-2 sm:px-3 py-2 lg:py-3">
          <div className="flex justify-between items-center">
            <div className="flex-1"></div>
            <div className="flex items-center gap-3">
              <img 
                src={cryptoHippoWithBitcoin}
                alt="HippoAI"
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-lg"
              />
            </div>
            <div className="flex-1 hidden sm:flex justify-end items-center">
              <img src={criptomonedas} alt="Crypto Coins" className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-contain drop-shadow-lg" />
            </div>
          </div>
        </div>
      </header>

      <div className="w-full h-[72px] overflow-hidden">
        <TickerTapeWidget />
      </div>

      <main className="flex-1 flex items-center justify-center px-2 sm:px-3 py-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
        <GlassCard className="w-full max-w-[95vw] p-6 lg:p-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400 bg-clip-text text-transparent">HippoAI</h2>
          <p className="text-lg text-white/80 mb-6">Your AI-powered trading assistant</p>
          <TradingAgent />
        </GlassCard>
      </main>
    </div>
  );
}
