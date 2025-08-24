import { UniversalNavigation } from "@/components/universal-navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { ExternalLink } from "lucide-react";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import hippoMouthOpen from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import hippoLaserEyes from "@assets/image_1755979639049.png";
import hippoDownload1 from "@assets/download (1)_1755979612947.jpeg";
import hippoDownload2 from "@assets/download_1755979612950.jpeg";
import hippoImages1 from "@assets/images (1)_1755979629737.jpeg";
import cuteHippo from "@assets/cute-cartoon-hippo-showing-off-butt-vector_1756060620427.jpg";
import { useScrollFade } from "@/hooks/useScrollFade";

export default function AboutPage() {
  const headerOpacity = useScrollFade(30, 120);

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300" style={{ opacity: headerOpacity }}>
        <div className="max-w-[95vw] mx-auto px-2 sm:px-3">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-full overflow-hidden">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white">
                CryptoHippo
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="about" />
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GlassCard className="p-8">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                What is CryptoHippo?
              </h1>
              
              <p className="text-lg text-crypto-silver leading-relaxed">
                CryptoHippo is an all-in-one trading dashboard designed to put everything you need in one place — market data, technical analysis, on-chain flows, sentiment, DeFi tools, and portfolio tracking. No more juggling tabs, apps, and bookmarks.
              </p>
              
              {/* First Hippo Image - Between "What is CryptoHippo" and "Why It Exists" */}
              <div className="flex justify-center my-8">
                <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg border-2 border-crypto-silver/20">
                  <img 
                    src={hippoMouthOpen} 
                    alt="Hippo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 text-center">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">Why It Exists</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>Crypto trading moves fast. Every second you spend switching between different sites is a second you might miss an opportunity. Traders often have:</p>
                  
                  <div className="space-y-1">
                    <p>• CMC open for token stats.</p>
                    <p>• TradingView for charting.</p>
                    <p>• Separate dashboards for DeFi positions.</p>
                    <p>• Multiple tabs for on-chain analytics.</p>
                    <p>• Twitter or news feeds for sentiment.</p>
                  </div>
                  
                  <p>This scattered workflow slows you down. CryptoHippo solves that.</p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">What You Get</h2>
                <div className="space-y-4 text-crypto-silver">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Market Overview</h3>
                    <div className="space-y-1 ml-4">
                      <p>• Fear & Greed Index</p>
                      <p>• BTC/ETH dominance</p>
                      <p>• Curated news feed</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Top Majors Analysis</h3>
                    <div className="space-y-1 ml-4">
                      <p>• TradingView charts for instant TA</p>
                      <p>• CoinMarketCap data without leaving the page</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">On-Chain Intelligence</h3>
                    <div className="space-y-1 ml-4">
                      <p>• Live net flows</p>
                      <p>• Trending tokens</p>
                      <p>• AI-powered sentiment feeds</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Chain-Specific Hubs</h3>
                    <div className="space-y-1 ml-4">
                      <p>• ETH, SOL, BASE, Bittensor, Abstract, HyperLiquid</p>
                      <p>• Chain-specific DeFi tools, trending tokens, and social analytics</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">DeFi Central</h3>
                    <div className="space-y-1 ml-4">
                      <p>• Farming, liquidity pools, perpetuals — all in one spot</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Stocks & Macro</h3>
                    <div className="space-y-1 ml-4">
                      <p>• Favorite equity watchlists</p>
                      <p>• Crypto treasury holdings</p>
                      <p>• Market context for macro trends</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Portfolio Tracking</h3>
                    <div className="space-y-1 ml-4">
                      <p>• Multi-chain wallet integration</p>
                      <p>• Real-time performance updates</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Hippo Image - Above "Who It's For" */}
              <div className="flex justify-center my-10">
                <div className="w-40 h-40 rounded-xl overflow-hidden shadow-xl border-2 border-green-500/30">
                  <img 
                    src={hippoLaserEyes} 
                    alt="Hippo with Laser Eyes" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">Who It's For</h2>
                <div className="space-y-1 text-crypto-silver">
                  <p>• Day traders who need speed and clarity</p>
                  <p>• DeFi farmers and liquidity providers</p>
                  <p>• On-chain analysts chasing alpha</p>
                  <p>• Swing traders who mix crypto and equities</p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">Why Traders Use It</h2>
                <div className="space-y-1 text-crypto-silver">
                  <p>• <span className="text-white font-medium">Save Time:</span> Skip the endless tab-switching.</p>
                  <p>• <span className="text-white font-medium">Trade Smarter:</span> Market, on-chain, and sentiment data together.</p>
                  <p>• <span className="text-white font-medium">React Faster:</span> Spot setups before the crowd moves.</p>
                  <p>• <span className="text-white font-medium">Stay Organized:</span> One hub for your entire workflow.</p>
                </div>
              </div>

              {/* Third Hippo Image - Above "Why This Matters" */}
              <div className="flex justify-center my-10">
                <div className="w-36 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-purple-500/30">
                  <img 
                    src={hippoDownload1} 
                    alt="Hippo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">Why This Matters</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>Crypto is still early. The tools, data, and opportunities are out there — but for newcomers, the learning curve can be steep. Finding the right charts, understanding on-chain activity, navigating DeFi platforms... it can take months (or years) to piece it all together.</p>
                  <p>CryptoHippo is built to shorten that curve.</p>
                  <p>By putting market data, on-chain analytics, sentiment, DeFi tools, and portfolio tracking into one clear, accessible hub, we make it easier for anyone to see the bigger picture and start making informed moves.</p>
                  <p>Our mission is simple: <span className="text-white font-medium">help more people go on-chain, faster.</span></p>
                  <p>When everything you need is in front of you, you can focus on learning, experimenting, and growing — instead of wasting time searching for the right tool or source.</p>
                  <p>Whether you're here to trade, farm, analyze, or just understand the market, CryptoHippo gives you the same clarity and speed the pros have — without the complexity.</p>
                </div>
              </div>

              {/* Fourth Hippo Image - Above "The Bigger Picture" */}
              <div className="flex justify-center my-12">
                <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-xl border-3 border-blue-500/40">
                  <img 
                    src={hippoImages1} 
                    alt="Hippo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">The Bigger Picture</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>Bitcoin isn't just code — it's a declaration of independence from a system designed to keep you playing a game you can never win. Fiat is debt. Inflation is theft. And the central banking model ensures you're always running just to stay in place.</p>
                  <p>The future belongs to those who think in satoshis, not cents.</p>
                  <p>It belongs to people who understand that real financial freedom comes from owning assets that no government can print, freeze, or seize.</p>
                  <p>Going on-chain isn't just about making trades — it's about reclaiming sovereignty over your wealth and moving beyond a centralized system that's stacked against you.</p>
                  <p>Every position you take, every move you make is a vote for decentralization, transparency, and wealth that can't be inflated away.</p>
                  <p>CryptoHippo exists to help you take that step with clarity, speed, and confidence.</p>
                </div>
              </div>

              {/* Fifth Hippo Image - Above "Recommended Reading" */}
              <div className="flex justify-center my-10">
                <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-xl border-2 border-pink-500/30">
                  <img 
                    src={cuteHippo} 
                    alt="Cute Hippo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">Recommended Reading</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>
                    🔗{' '}
                    <a
                      href="https://substack.com/@thebetterpath"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline transition-colors"
                    >
                      The Better Path
                    </a>
                  </p>
                  <p>
                    If you're curious why now is the time to get into Bitcoin and crypto, this blog is a must-read. It breaks down — in plain language — how our current financial system is broken and why digital assets represent the future of money, ownership, and freedom.
                  </p>
                </div>
              </div>

            </div>

            {/* About .locker Section */}
            <div className="space-y-6 text-center">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">About .locker</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>CryptoHippo uses a .locker domain — a new kind of web address that's both a traditional domain and a blockchain-secured identity. When you register a .locker, it's linked to the Bitcoin Naming System (BNS), meaning your Web3 identity is anchored to the most secure and decentralized blockchain in existence.</p>
                  
                  <p>This isn't just about a cooler domain name — it's about preparing for a future where online identity, ownership, and interaction all live on-chain. As crypto adoption grows, .locker domains bridge the gap between the familiar Web2 internet and the trustless, decentralized Web3 ecosystem.</p>
                  
                  <p>By using .locker, CryptoHippo signals its commitment to that future — one where traders, investors, and everyday users can control their own identity, data, and assets without relying on centralized gatekeepers.</p>
                </div>
              </div>
            </div>

            {/* Fifth Hippo Image - Centered */}
            <div className="flex justify-center my-12">
              <div className="w-44 h-44 rounded-full overflow-hidden shadow-2xl border-4 border-orange-500/40">
                <img 
                  src={hippoDownload2} 
                  alt="Hippo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Support Section */}
            <div className="mt-12 pt-8 border-t border-crypto-silver/20">
              <h2 className="text-2xl font-semibold text-white mb-6 text-center">Support CryptoHippo</h2>
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
      </main>
    </div>
  );
}