import { ExternalLink } from "lucide-react";

export function HypeSection() {
  return (
    <div className="space-y-6">
      {/* Hyperliquid Trading */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">H</span>
          </div>
          Hyperliquid HYPE Trading
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
            LIVE TRADING
          </span>
          <a
            href="https://app.hyperliquid.xyz/trade/HYPE"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </a>
        </h3>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
          <iframe
            src="https://app.hyperliquid.xyz/trade/HYPE"
            className="w-full h-[600px] border-0"
            title="Hyperliquid HYPE Trading"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Live HYPE trading on Hyperliquid • Real-time orderbook and charts
          </p>
        </div>
      </div>

      {/* Hyperdash Analytics */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">H</span>
          </div>
          Hyperdash Analytics
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
            ANALYTICS
          </span>
          <a
            href="https://hyperdash.info/analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </a>
        </h3>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
          <iframe
            src="https://hyperdash.info/analytics"
            className="w-full h-[600px] border-0"
            title="Hyperdash Analytics"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Hyperliquid ecosystem analytics • Volume, TVL, and performance metrics
          </p>
        </div>
      </div>
    </div>
  );
}