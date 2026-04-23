import { useEffect, useRef } from "react";

export default function TickerTapeWidget() {
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
      doc.write(`<!DOCTYPE html>
<html>
<head>
<style>
  body { margin:0; padding:0; overflow:hidden; background:transparent; }
  .tradingview-widget-copyright,
  [class*="copyright"],
  [class*="Attribution"],
  a[href*="tradingview.com"][target="_blank"]:not([href*="chart"]) { display:none !important; }
</style>
</head>
<body>
<script type="module" src="https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js"><\/script>
<tv-ticker-tape
  symbols='FOREXCOM:SPXUSD,FOREXCOM:NSXUSD,FOREXCOM:DJI,CAPITALCOM:DXY,CAPITALCOM:VIX,CAPITALCOM:GOLD,CAPITALCOM:SILVER,BITSTAMP:BTCUSD,BITSTAMP:ETHUSD'
  hover-type="performance-grid"
  show-hover
  theme="dark"
></tv-ticker-tape>
<script>
  const hide = (el) => { if (el && el.style) el.style.setProperty('display','none','important'); };
  const sweep = (root) => {
    root.querySelectorAll('[class*="copyright"],[class*="Attribution"],.tradingview-widget-copyright').forEach(hide);
    root.querySelectorAll('a[href*="tradingview.com"]').forEach((a) => {
      if (!a.href.includes('chart')) hide(a.parentElement || a);
    });
  };
  const obs = new MutationObserver(() => {
    sweep(document.body);
    document.querySelectorAll('tv-ticker-tape,*').forEach((el) => {
      if (el.shadowRoot) sweep(el.shadowRoot);
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });
<\/script>
</body>
</html>`);
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
