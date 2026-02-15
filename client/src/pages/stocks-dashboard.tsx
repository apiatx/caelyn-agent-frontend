import { useEffect, useRef, memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Newspaper, Calendar } from "lucide-react";
import TickerTapeWidget from "@/components/TickerTapeWidget";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

const ForexHeatmapWidget = memo(function ForexHeatmapWidget() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: true,
      locale: "en",
      currencies: ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD", "CNY"],
      width: "100%",
      height: "100%"
    });
    container.current.appendChild(script);
  }, []);
  return (
    <div className="tradingview-widget-container" ref={container} style={{ width: "100%", height: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ width: "100%", height: "100%" }}></div>
    </div>
  );
});

function EconomicMapWidget() {
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
      doc.write(`<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;background:transparent;}</style></head><body><script type="module" src="https://widgets.tradingview-widget.com/w/en/tv-economic-map.js"><\/script><tv-economic-map style="width:100%;height:700px;display:block;"></tv-economic-map></body></html>`);
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

const TopStoriesWidget = memo(function TopStoriesWidget() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      displayMode: "regular",
      feedMode: "market",
      colorTheme: "dark",
      isTransparent: false,
      locale: "en",
      market: "stock",
      width: "100%",
      height: 550
    });
    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
});

const EconomicCalendarWidget = memo(function EconomicCalendarWidget() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: false,
      locale: "en",
      countryFilter: "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
      importanceFilter: "-1,0,1",
      width: "100%",
      height: 550
    });
    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
});

export default function StocksDashboardPage() {
  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      <div className="w-full h-[72px] overflow-hidden">
        <TickerTapeWidget />
      </div>

      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-4 lg:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
            <GlassCard className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Newspaper className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Top Stories</h3>
              </div>
              <div className="w-full min-h-[560px] rounded-lg overflow-hidden border border-crypto-silver/20">
                <TopStoriesWidget />
              </div>
            </GlassCard>

            <GlassCard className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Economic Calendar</h3>
              </div>
              <div className="w-full min-h-[560px] rounded-lg overflow-hidden border border-crypto-silver/20">
                <EconomicCalendarWidget />
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Forex Heatmap</h3>
            </div>
            <div className="w-full h-[500px] rounded-lg overflow-hidden border border-crypto-silver/20">
              <ForexHeatmapWidget />
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Economic Map</h3>
            </div>
            <div className="w-full h-[700px] rounded-lg overflow-hidden border border-crypto-silver/20">
              <EconomicMapWidget />
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
