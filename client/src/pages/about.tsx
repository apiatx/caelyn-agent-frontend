import { UniversalNavigation } from "@/components/universal-navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { ExternalLink } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <UniversalNavigation activePage="about" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GlassCard className="p-8">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                What is CryptoTrack Pro?
              </h1>
              
              <p className="text-lg text-crypto-silver leading-relaxed">
                CryptoTrack Pro is an all-in-one trading dashboard designed to put everything you need in one place — market data, technical analysis, on-chain flows, sentiment, DeFi tools, and portfolio tracking. No more juggling tabs, apps, and bookmarks.
              </p>
            </div>

            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">Why It Exists</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>Crypto trading moves fast. Every second you spend switching between different sites is a second you might miss an opportunity. Traders often have:</p>
                  
                  <ul className="space-y-2 ml-4">
                    <li>• CMC open for token stats.</li>
                    <li>• TradingView for charting.</li>
                    <li>• Separate dashboards for DeFi positions.</li>
                    <li>• Multiple tabs for on-chain analytics.</li>
                    <li>• Twitter or news feeds for sentiment.</li>
                  </ul>
                  
                  <p>This scattered workflow slows you down. CryptoTrack Pro solves that.</p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">What You Get</h2>
                <div className="space-y-4 text-crypto-silver">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Market Overview</h3>
                    <ul className="ml-4 space-y-1">
                      <li>• Fear & Greed Index</li>
                      <li>• BTC/ETH dominance</li>
                      <li>• Curated news feed</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Top Majors Analysis</h3>
                    <ul className="ml-4 space-y-1">
                      <li>• TradingView charts for instant TA</li>
                      <li>• CoinMarketCap data without leaving the page</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">On-Chain Intelligence</h3>
                    <ul className="ml-4 space-y-1">
                      <li>• Live net flows</li>
                      <li>• Trending tokens</li>
                      <li>• AI-powered sentiment feeds</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Chain-Specific Hubs</h3>
                    <ul className="ml-4 space-y-1">
                      <li>• ETH, SOL, BASE, Bittensor, Abstract, HyperLiquid</li>
                      <li>• Chain-specific DeFi tools, trending tokens, and social analytics</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">DeFi Central</h3>
                    <ul className="ml-4 space-y-1">
                      <li>• Farming, liquidity pools, perpetuals — all in one spot</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Stocks & Macro</h3>
                    <ul className="ml-4 space-y-1">
                      <li>• Favorite equity watchlists</li>
                      <li>• Crypto treasury holdings</li>
                      <li>• Market context for macro trends</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Portfolio Tracking</h3>
                    <ul className="ml-4 space-y-1">
                      <li>• Multi-chain wallet integration</li>
                      <li>• Real-time performance updates</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">Who It's For</h2>
                <ul className="space-y-2 ml-4 text-crypto-silver">
                  <li>• Day traders who need speed and clarity</li>
                  <li>• DeFi farmers and liquidity providers</li>
                  <li>• On-chain analysts chasing alpha</li>
                  <li>• Swing traders who mix crypto and equities</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">Why Traders Use It</h2>
                <ul className="space-y-2 ml-4 text-crypto-silver">
                  <li>• <span className="text-white font-medium">Save Time:</span> Skip the endless tab-switching.</li>
                  <li>• <span className="text-white font-medium">Trade Smarter:</span> Market, on-chain, and sentiment data together.</li>
                  <li>• <span className="text-white font-medium">React Faster:</span> Spot setups before the crowd moves.</li>
                  <li>• <span className="text-white font-medium">Stay Organized:</span> One hub for your entire workflow.</li>
                </ul>
              </div>
            </div>

            {/* Support Section */}
            <div className="mt-12 pt-8 border-t border-crypto-silver/20">
              <h2 className="text-2xl font-semibold text-white mb-6">Support CryptoHippo</h2>
              <a
                href="https://buymeacoffee.com/aidanpilonb?new=1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105"
              >
                <ExternalLink className="w-4 h-4" />
                Buy Me A Coffee
              </a>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}