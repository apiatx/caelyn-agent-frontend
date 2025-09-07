import { UniversalNavigation } from "@/components/universal-navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Bitcoin } from "lucide-react";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import hippoMouthOpen from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import hippoLaserEyes from "@assets/download (3)_1757211707979.png";
import hippoDownload1 from "@assets/CryptoHippo_1757212757402.png";
import hippoDownload2 from "@assets/download_1755979612950.jpeg";
import hippoImages1 from "@assets/download (4)_1757214892954.png";
import cuteHippo from "@assets/cute-cartoon-hippo-showing-off-butt-vector_1756060620427.jpg";
import cryptoLogos from "@assets/ChatGPT Image Sep 7, 2025, 01_02_03 AM_1757225008661.png";
import { useScrollFade } from "@/hooks/useScrollFade";

export default function AboutPage() {
  const headerOpacity = useScrollFade(30, 120);

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header 
        className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300 relative overflow-hidden" 
        style={{ opacity: headerOpacity }}
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage: `url(${newHeaderBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {/* Crypto Logos - Top Right */}
        <div className="absolute top-2 right-2 z-20 w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 opacity-90">
          <img 
            src={cryptoLogos}
            alt="Cryptocurrency Logos"
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>
        {/* Content Layer */}
        <div className="relative z-10 max-w-[95vw] mx-auto px-2 sm:px-3">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-lg">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white drop-shadow-lg">
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
                <div className="w-48 h-48 rounded-full overflow-hidden shadow-lg border-2 border-yellow-400">
                  <img 
                    src={hippoDownload1} 
                    alt="DeFi Hub" 
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
                <div className="w-40 h-40 rounded-xl overflow-hidden shadow-xl border-2 border-yellow-400">
                  <img 
                    src={cuteHippo} 
                    alt="Cute Hippo" 
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
                  <p>• <span className="text-white font-medium">Control the Context:</span> Market, on-chain, and sentiment data together.</p>
                  <p>• <span className="text-white font-medium">React Faster:</span> Spot setups before the crowd moves.</p>
                  <p>• <span className="text-white font-medium">Trade Smarter:</span> One hub for your entire workflow.</p>
                </div>
              </div>

              {/* Third Hippo Image - Above "Why This Matters" */}
              <div className="flex justify-center my-10">
                <div className="w-36 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-yellow-400">
                  <img 
                    src={hippoImages1} 
                    alt="Social Intelligence" 
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
                <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-xl border-2 border-yellow-400">
                  <img 
                    src={hippoDownload2} 
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
                <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-xl border-2 border-yellow-400">
                  <img 
                    src={hippoLaserEyes} 
                    alt="Market Overview" 
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

            {/* The Case for Bitcoin */}
            <div className="mt-12 pt-8 border-t border-crypto-silver/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <Bitcoin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">The Case for Bitcoin</h3>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                    VANECK RESEARCH
                  </Badge>
                </div>
              </div>

              <button
                onClick={() => window.open('https://www.vaneck.com/us/en/blogs/digital-assets/the-investment-case-for-bitcoin/', '_blank', 'noopener,noreferrer')}
                className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-6 transition-all duration-300 text-left group w-full mb-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-medium text-white group-hover:text-orange-300 mb-2">VanEck: The Investment Case for Bitcoin</div>
                    <div className="text-sm text-crypto-silver">Comprehensive institutional research on Bitcoin as an investment asset</div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
                </div>
              </button>
            </div>

            {/* Centered Hippo Image - Between VanEck and Support */}
            <div className="flex justify-center my-12">
              <div className="w-44 h-44 rounded-full overflow-hidden shadow-2xl border-2 border-yellow-400">
                <img 
                  src={hippoMouthOpen} 
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