import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Bitcoin } from "lucide-react";
import hippoMouthOpen from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import hippoLaserEyes from "@assets/download (3)_1757211707979.png";
import hippoDownload1 from "@assets/CryptoHippo_1757212757402.png";
import hippoDownload2 from "@assets/download_1755979612950.jpeg";
import hippoImages1 from "@assets/download (4)_1757214892954.png";
import cuteHippo from "@assets/cute-cartoon-hippo-showing-off-butt-vector_1756060620427.jpg";

export default function AboutPage() {
  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GlassCard className="p-8">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Most trading setups are a mess.
              </h1>

              <p className="text-lg text-crypto-silver leading-relaxed">
                You've got twenty tabs open, three different terminal apps running, and a Twitter feed that's 90% noise. By the time you've checked the on-chain flows, looked at the 4-hour chart on TradingView, and scanned the latest macro data, the trade has already moved.
              </p>

              <p className="text-lg text-crypto-silver leading-relaxed">
                We started as CryptoHippo, focused strictly on the blockchain. But the world moved on. The lines between crypto, stocks, commodities, and prediction markets have blurred. If you're only looking at one, you're missing the bigger picture.
              </p>

              <p className="text-lg text-crypto-silver leading-relaxed">
                So, we built <span className="text-white font-semibold">HippoAI</span>. It's the dashboard we actually wanted to use — a single command center for everything that moves the needle.
              </p>

              <div className="flex justify-center my-8">
                <div className="w-48 h-48 rounded-full overflow-hidden shadow-lg border-2 border-yellow-400">
                  <img
                    src={hippoDownload1}
                    alt="HippoAI"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 text-center">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">The "Two-Brain" Advantage</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>Most "AI trading tools" are just glorified search bars. HippoAI is different. We built a <span className="text-white font-medium">Dual-Engine AI Agent</span> that acts like a high-level research team working 24/7.</p>

                  <p>Think of it as having two distinct specialists in your ear:</p>

                  <div className="text-left max-w-2xl mx-auto space-y-4 mt-4">
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-blue-400 mb-2">The Quant</h3>
                      <p className="text-crypto-silver">This side of the AI lives in the data. It digests government filings, official financial reports, and complex technical analysis with cold, hard logic.</p>
                    </div>

                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-purple-400 mb-2">The Hunter</h3>
                      <p className="text-crypto-silver">This side lives on the street. It monitors social sentiment and breaking news in real-time, catching the "vibe" of the market before it shows up on a candle chart.</p>
                    </div>
                  </div>

                  <p className="mt-4">By letting these two "minds" reason together, HippoAI filters out the garbage and gives you actual clarity on what's happening — and why.</p>
                </div>
              </div>

              <div className="flex justify-center my-10">
                <div className="w-40 h-40 rounded-xl overflow-hidden shadow-xl border-2 border-yellow-400">
                  <img
                    src={cuteHippo}
                    alt="HippoAI"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">Everything in One View</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>We didn't just add a few stock tickers and call it a day. HippoAI is a full-spectrum terminal:</p>

                  <div className="text-left max-w-2xl mx-auto space-y-3 mt-4">
                    <div className="flex items-start gap-3">
                      <span className="text-white font-medium whitespace-nowrap">Stocks & Crypto:</span>
                      <span>High-speed data and charting for both worlds.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-white font-medium whitespace-nowrap">On-Chain & DeFi:</span>
                      <span>Real-time net flows, liquidity pools, and trending tokens on ETH, SOL, BASE, and beyond.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-white font-medium whitespace-nowrap">RWA & Commodities:</span>
                      <span>Track the tokenization of the real world — from Gold and Oil to Real-World Assets.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-white font-medium whitespace-nowrap">Prediction Markets:</span>
                      <span>See where the actual money is betting on global events and politics.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center my-10">
                <div className="w-36 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-yellow-400">
                  <img
                    src={hippoImages1}
                    alt="Full Spectrum"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">Why We Care</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>The current financial system is basically a game of musical chairs where the music is controlled by central banks. Fiat is debt. Inflation is a slow-motion heist.</p>

                  <p>We believe the only way to win is through <span className="text-white font-medium">sovereignty</span>. That means owning your assets, your data, and your identity. It's why we use a <span className="text-white font-medium">.locker domain</span> — anchoring our identity to the Bitcoin Naming System (BNS). It's not just a URL; it's a commitment to a decentralized web where you aren't the product.</p>

                  <p>HippoAI exists to give you the same speed and "alpha" that the pros have, without the gatekeepers.</p>
                </div>
              </div>

              <div className="flex justify-center my-12">
                <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-xl border-2 border-yellow-400">
                  <img
                    src={hippoDownload2}
                    alt="Sovereignty"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">Stop Chasing. Start Leading.</h2>
                <div className="text-crypto-silver space-y-4">
                  <p>The old system is designed to keep you a step behind, reacting to headlines that are already priced in. HippoAI was built to flip the script. We give you the tools, the data, and the AI-driven edge to see the move before the crowd does.</p>

                  <p className="text-white font-medium text-lg">The board is set. It's time to take control of your wealth and trade with total clarity.</p>
                </div>
              </div>

              <div className="flex justify-center my-10">
                <div className="w-44 h-44 rounded-full overflow-hidden shadow-2xl border-2 border-yellow-400">
                  <img
                    src={hippoMouthOpen}
                    alt="HippoAI"
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

            <div className="flex justify-center my-12">
              <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-xl border-2 border-yellow-400">
                <img
                  src={hippoLaserEyes}
                  alt="HippoAI"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

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
