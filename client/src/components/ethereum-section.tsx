import { ExternalLink, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { openSecureLink } from "@/utils/security";
import ethereumLogo from "@assets/Ethereum_logo_2014.svg_1755977414942.png";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20 ${className}`}>
    {children}
  </Card>
);

const SafeLink = ({ href, children, className = "", ...props }: { href: string; children: React.ReactNode; className?: string; [key: string]: any }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer" 
    className={className}
    {...props}
  >
    {children}
  </a>
);

const SafeIframe = ({ src, title, className = "", ...props }: { src: string; title: string; className?: string; [key: string]: any }) => (
  <iframe
    src={src}
    title={title}
    className={className}
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    {...props}
  />
);

export function EthereumSection() {
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <img src={ethereumLogo} alt="Ethereum" className="w-8 h-8 rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white">Ethereum Network</h1>
        </div>
        <p className="text-crypto-silver">Live Ethereum charts and trending tokens analysis</p>
      </div>
      {/* Ethereum Price Chart */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">ETH</span>
          </div>
          Ethereum Price Chart
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
            LIVE CHART
          </span>
          <SafeLink
            href="https://coinmarketcap.com/currencies/ethereum/"
            className="ml-auto text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            CoinMarketCap <ExternalLink className="w-3 h-3" />
          </SafeLink>
          <SafeLink
            href="https://www.tradingview.com/chart/e5l95XgZ/?symbol=BITSTAMP%3AETHUSD"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            Open Full Chart <ExternalLink className="w-3 h-3" />
          </SafeLink>
        </h3>
        
        <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
          <iframe
            src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BITSTAMP%3AETHUSD"
            className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
            title="Ethereum Advanced Chart"
            frameBorder="0"
            scrolling="no"
          />
        </div>
      </div>

      {/* Trending Ethereum Tokens */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">🔥</span>
          </div>
          Trending Ethereum Tokens
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
            LIVE TRENDING
          </span>
          <SafeLink
            href="https://dexscreener.com/ethereum"
            className="ml-auto text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </SafeLink>
        </h3>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden space-y-4">
          <div className="px-4 py-4">
            <button
              onClick={() => openInNewTab("https://dexscreener.com/ethereum?theme=dark")}
              className="w-full p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-green-400 font-semibold">DexScreener</h4>
              </div>
              <p className="text-gray-400 text-sm">Live trending Ethereum tokens and pair analytics with real-time charts</p>
            </button>
          </div>
          
          {/* Birdeye Ethereum */}
          <div className="border-t border-crypto-silver/20 pt-4 px-4 pb-4">
            <button
              onClick={() => openInNewTab("https://birdeye.so/ethereum")}
              className="w-full p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-orange-400 font-semibold">Birdeye</h4>
              </div>
              <p className="text-gray-400 text-sm">Comprehensive Ethereum token analytics with advanced charts and market insights</p>
            </button>
          </div>
          
          {/* 30 Day Trending on OpenSea */}
          <div className="border-t border-crypto-silver/20 pt-4 px-4 pb-4">
            <button
              onClick={() => openInNewTab('https://opensea.io/stats/tokens?sortBy=thirtyDayPriceChange&chains=ethereum')}
              className="w-full p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-cyan-400 font-semibold">OpenSea</h4>
              </div>
              <p className="text-gray-400 text-sm">Trending Ethereum tokens by 30-day price changes</p>
            </button>
          </div>
        </div>
      </div>


      {/* Ethereum Layer 2 Solutions */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">L2</span>
          </div>
          Layer 2 Analytics
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
            L2BEAT
          </span>
          <SafeLink
            href="https://l2beat.com/"
            className="ml-auto text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </SafeLink>
        </h3>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden space-y-4">
          <SafeIframe
            src="https://l2beat.com/"
            title="Layer 2 Analytics by L2Beat"
            className="w-full h-[600px] border-0"
          />
          
          {/* GrowThePie Analytics */}
          <div className="border-t border-crypto-silver/20 pt-4 px-4 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white">GrowThePie</h4>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                  L2 ANALYTICS
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://www.growthepie.com/')}
                className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm ml-auto"
              >
                Open Full View →
              </button>
            </div>
            <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 overflow-hidden">
              <SafeIframe
                src="https://www.growthepie.com/"
                title="GrowThePie Layer 2 Analytics"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] border-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-6">
        <h4 className="text-md font-semibold text-white mb-3">Quick Access</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SafeLink
            href="https://etherscan.io/gastracker"
            className="block p-3 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
          >
            <div className="text-center">
              <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-xs">⛽</span>
              </div>
              <span className="text-xs text-green-400 font-medium">Gas Tracker</span>
            </div>
          </SafeLink>

          <SafeLink
            href="https://uniswap.org/"
            className="block p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-colors"
          >
            <div className="text-center">
              <div className="w-8 h-8 bg-pink-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-xs">🦄</span>
              </div>
              <span className="text-xs text-pink-400 font-medium">Uniswap</span>
            </div>
          </SafeLink>

          <SafeLink
            href="https://aave.com/"
            className="block p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
          >
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <span className="text-xs text-blue-400 font-medium">Aave</span>
            </div>
          </SafeLink>

          <SafeLink
            href="https://opensea.io/"
            className="block p-3 rounded-lg bg-blue-600/10 border border-blue-600/20 hover:bg-blue-600/20 transition-colors"
          >
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-xs">🌊</span>
              </div>
              <span className="text-xs text-blue-400 font-medium">OpenSea</span>
            </div>
          </SafeLink>

          <SafeLink
            href="https://compound.finance/"
            className="block p-3 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
          >
            <div className="text-center">
              <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="text-xs text-green-400 font-medium">Compound</span>
            </div>
          </SafeLink>
        </div>
      </div>

    </div>
  );
}

export default EthereumSection;