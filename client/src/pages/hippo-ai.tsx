import { useEffect, useRef } from "react";
import TradingAgent from "@/components/TradingAgent";
import TickerTapeWidget from "@/components/TickerTapeWidget";

function BottomTickerTape() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
    ref.current.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;background:transparent;}</style></head><body><script type="module" src="https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js"><\/script><tv-ticker-tape symbols='NASDAQ:NVDA,NASDAQ:MSFT,NASDAQ:GOOG,NASDAQ:AAPL,NASDAQ:META,NASDAQ:TSLA,NASDAQ:AMZN,NASDAQ:PLTR,NASDAQ:AMD,NASDAQ:MU,NASDAQ:AVGO,NYSE:ORCL,NYSE:TSM,NASDAQ:SNDK' hover-type="performance-grid" show-hover theme="dark" transparent></tv-ticker-tape></body></html>`);
      doc.close();
    }
    return () => {
      if (ref.current && iframe.parentNode === ref.current) {
        ref.current.removeChild(iframe);
      }
    };
  }, []);
  return <div ref={ref} className="w-full h-full" />;
}

export default function HippoAIPage() {
  return (
    <div className="text-white" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

      <div className="relative z-50 w-full flex-shrink-0 overflow-hidden border-b border-white/5 backdrop-blur-lg" style={{ height: 78, background: 'rgba(5, 5, 16, 0.85)' }}>
        <div style={{ height: '110px' }}>
          <TickerTapeWidget />
        </div>
      </div>

      <div className="relative z-10" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TradingAgent />
      </div>

      <div className="relative z-50 w-full flex-shrink-0 overflow-hidden border-t border-white/5 backdrop-blur-lg" style={{ height: 78, background: 'rgba(5, 5, 16, 0.85)' }}>
        <div style={{ height: '110px' }}>
          <BottomTickerTape />
        </div>
      </div>
    </div>
  );
}
