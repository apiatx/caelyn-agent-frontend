import { useEffect, useRef } from "react";
import cryptoHippoLogo from "@assets/image_1771140771730.png";
import TradingAgent from "@/components/TradingAgent";

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
  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <div className="fixed inset-0 z-0" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 20% 30%, rgba(120, 40, 200, 0.35) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 80% 20%, rgba(30, 60, 180, 0.3) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 60% 70%, rgba(180, 50, 120, 0.25) 0%, transparent 50%),
          radial-gradient(ellipse 50% 50% at 10% 80%, rgba(20, 80, 160, 0.2) 0%, transparent 50%),
          radial-gradient(ellipse 40% 30% at 90% 85%, rgba(100, 30, 150, 0.2) 0%, transparent 45%),
          linear-gradient(180deg, #050510 0%, #0a0a1a 30%, #0d0820 60%, #080515 100%)
        `
      }} />
      <div className="fixed inset-0 z-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(rgba(100, 180, 255, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(100, 180, 255, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px'
      }} />
      <div className="fixed inset-0 z-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 100 Q50 80 80 100 T140 100 T200 100' fill='none' stroke='%234af' stroke-width='0.5'/%3E%3Cpath d='M0 60 Q40 40 80 60 T160 60 T200 60' fill='none' stroke='%23a4f' stroke-width='0.4'/%3E%3Ccircle cx='150' cy='30' r='2' fill='%234af' opacity='0.5'/%3E%3Ccircle cx='50' cy='150' r='1.5' fill='%23a4f' opacity='0.4'/%3E%3Ccircle cx='180' cy='170' r='1' fill='%234af' opacity='0.3'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px'
      }} />

      <div className="relative z-10 w-full h-[72px] overflow-hidden border-b border-white/5" style={{ background: 'rgba(5, 5, 16, 0.5)' }}>
        <TickerTapeWidget />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-2 sm:px-3 py-8" style={{ minHeight: 'calc(100vh - 72px)' }}>
        <div className="w-full max-w-[1000px] mx-auto">
          <div className="text-center mb-8">
            <img 
              src={cryptoHippoLogo}
              alt="HippoAI Mascot"
              className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4 drop-shadow-[0_0_30px_rgba(120,80,255,0.5)]"
            />
            <h2 className="text-4xl sm:text-5xl font-bold mb-3" style={{
              background: 'linear-gradient(135deg, #c0c0c0 0%, #ffffff 25%, #e0d0ff 50%, #ffffff 75%, #c0c0c0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.02em'
            }}>HippoAI</h2>
            <p className="text-base sm:text-lg text-white/60 font-light tracking-wide">Your AI-powered trading assistant</p>
          </div>

          <div className="relative rounded-2xl overflow-hidden" style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 40, 0.8) 0%, rgba(15, 15, 35, 0.9) 50%, rgba(20, 20, 40, 0.8) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 60px rgba(80, 40, 160, 0.15), 0 0 120px rgba(40, 60, 180, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}>
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
              backgroundImage: `
                linear-gradient(rgba(100, 180, 255, 0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(100, 180, 255, 0.5) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }} />
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(120, 80, 255, 0.4) 30%, rgba(80, 180, 255, 0.4) 70%, transparent 100%)'
            }} />
            <div className="relative z-10 p-6 lg:p-8">
              <TradingAgent />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
