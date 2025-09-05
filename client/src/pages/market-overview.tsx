import { MarketOverviewSection } from '@/components/market-overview-section';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Globe } from 'lucide-react';

// Function to open external links
const openInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export default function MarketOverviewPage() {
  return (
    <div className="max-w-[95vw] mx-auto px-2 sm:px-3 mt-4 pb-8">
      <h1 className="text-2xl font-bold text-white mb-6">Market Overview</h1>
      
      {/* Market Overview Section */}
      <MarketOverviewSection />
      
      {/* M2 Global Liquidity Index Chart */}
      <GlassCard className="p-3 sm:p-4 lg:p-6 mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">M2</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">M2 Global Liquidity Index</h3>
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
              LIQUIDITY
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openInNewTab('https://www.tradingview.com/script/34U4rcdC/')}
              className="text-indigo-400 hover:text-indigo-300 text-xs sm:text-sm flex items-center gap-1"
            >
              M2 / BTC <ExternalLink className="w-3 h-3" />
            </button>
            <span className="text-crypto-silver text-xs">|</span>
            <button
              onClick={() => openInNewTab('https://www.tradingview.com/chart/e5l95XgZ/')}
              className="text-indigo-400 hover:text-indigo-300 text-xs sm:text-sm"
            >
              Open in New Tab →
            </button>
          </div>
        </div>

        <div className="w-full">
          <iframe
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_m2global&symbol=FRED%3AM2SL&interval=1M&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0a0a&studies=[]&hideideas=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22,%22timeframes_toolbar%22,%22show_interval_dialog_on_key_press%22]&disabled_features=[]&locale=en&utm_source=cryptohippo.com&utm_medium=widget&utm_campaign=chart&utm_term=FRED%3AM2SL"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="M2 Global Liquidity Index Chart"
            frameBorder="0"
            scrolling="no"
          />
        </div>
      </GlassCard>

      {/* News Section */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-400" />
            News
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => openInNewTab('https://www.binance.com/en/square')}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 cursor-pointer group hover:opacity-80 transition-opacity duration-200"
              title="Click to view Binance Square"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">B</span>
                </div>
                <h4 className="text-white font-medium">Binance Square</h4>
              </div>
              <p className="text-gray-400 text-sm">Crypto news and social updates</p>
            </div>

            <div 
              onClick={() => openInNewTab('https://coinmarketcap.com/leaderboard/')}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 cursor-pointer group hover:opacity-80 transition-opacity duration-200"
              title="Click to view CMC Leaderboard"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <h4 className="text-white font-medium">CMC Leaderboard</h4>
              </div>
              <p className="text-gray-400 text-sm">Market Rankings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}