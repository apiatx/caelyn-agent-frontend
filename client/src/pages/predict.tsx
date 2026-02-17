import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ExternalLink } from "lucide-react";
import { openSecureLink } from "@/utils/security";
import diceImage from "@assets/istockphoto-1252690598-612x612_1756665072306.jpg";
import predictBaseLogo from "@assets/predictbase-logo.jpg";

const SmallLink = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
  >
    {label} <ExternalLink className="w-3 h-3" />
  </a>
);


// Safe components for external links
const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function PredictPage() {
  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Prediction Markets Section - Enhanced Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-yellow-500/20 blur-3xl -z-10"></div>
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300 overflow-hidden">
              <img 
                src={diceImage}
                alt="Prediction Markets"
                className="w-28 h-28 object-cover"
              />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-orange-200 to-yellow-200 bg-clip-text text-transparent">Prediction Markets</h2>
          </div>
          <p className="text-lg text-white/80 font-medium tracking-wide">Decentralized Casino and Analytics</p>
          <div className="w-32 h-1 bg-gradient-to-r from-orange-500 to-yellow-500 mx-auto mt-4 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Prediction Markets Section */}
        <GlassCard className="p-6">
          <div className="flex justify-end mb-1">
            <SmallLink href="https://polymarket.com/crypto" label="Open Polymarket" />
          </div>
          <iframe
            src="https://polymarket.com/crypto"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Polymarket"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />

          <div className="flex justify-end mb-1 mt-6">
            <SmallLink href="https://predictbase.app/" label="Open PredictBase" />
          </div>
          <iframe
            src="https://predictbase.app/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="PredictBase"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
          />

          <div className="flex justify-end mb-1 mt-6">
            <SmallLink href="https://betbase.xyz/" label="Open BetBase" />
          </div>
          <iframe
            src="https://betbase.xyz/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="BetBase"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
          />

          <div className="flex justify-end mb-1 mt-6">
            <SmallLink href="https://pmx.trade/markets" label="Open PMX Trading" />
          </div>
          <iframe
            src="https://pmx.trade/markets"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="PMX Trading"
            frameBorder="0"
            scrolling="yes"
          />

          {/* Kalshi */}
          <div className="mt-6">
            <div className="p-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Kalshi</h3>
                </div>
                <Button
                  onClick={() => openInNewTab("https://kalshi.com/")}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Kalshi
                </Button>
              </div>
              <p className="text-crypto-silver mb-4">
                CFTC-regulated prediction markets where you can trade on real-world events.
              </p>
              <div className="bg-black/20 rounded-lg p-4 border border-indigo-500/20">
                <p className="text-sm text-crypto-silver">
                  📊 Trade on elections, economic data, and news events
                  <br />
                  🏛️ CFTC-regulated and fully legal in the US
                  <br />
                  💰 Real money trading with transparent odds
                </p>
              </div>
            </div>
          </div>

          {/* TrueMarkets */}
          <div className="mt-6">
            <div className="p-6 bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">TrueMarkets</h3>
                </div>
                <Button
                  onClick={() => openInNewTab("https://app.truemarkets.org/en/markets")}
                  className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open TrueMarkets
                </Button>
              </div>
              <p className="text-crypto-silver mb-4">
                Decentralized prediction markets platform with transparent and trustless betting mechanisms.
              </p>
              <div className="bg-black/20 rounded-lg p-4 border border-green-500/20">
                <p className="text-sm text-crypto-silver">
                  🎯 Decentralized prediction markets on blockchain
                  <br />
                  🔒 Trustless and transparent betting protocols
                  <br />
                  📊 Wide range of prediction market categories
                </p>
              </div>
            </div>
          </div>
          
          {/* Cloudbet Sports Betting */}
          <div className="mt-6">
            <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Cloudbet Sports Betting</h3>
                </div>
                <Button
                  onClick={() => openInNewTab("https://www.cloudbet.com/en/sports")}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Cloudbet
                </Button>
              </div>
              <p className="text-crypto-silver mb-4">
                Professional crypto sports betting platform with competitive odds and live betting options.
              </p>
              <div className="bg-black/20 rounded-lg p-4 border border-blue-500/20">
                <p className="text-sm text-crypto-silver">
                  🎯 Crypto-first sportsbook with Bitcoin, Ethereum, and altcoin betting
                  <br />
                  ⚡ Live betting on major sports events
                  <br />
                  🔒 Provably fair gaming and instant withdrawals
                </p>
              </div>
            </div>
          </div>
          
          {/* Betly.trade */}
          <div className="mt-6">
            <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Betly.trade</h3>
                </div>
                <Button
                  onClick={() => openInNewTab("https://www.betly.trade/categories")}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Betly
                </Button>
              </div>
              <p className="text-crypto-silver mb-4">
                Social betting made simple. Swipe on prediction markets, not thots.
              </p>
              <div className="bg-black/20 rounded-lg p-4 border border-purple-500/20">
                <p className="text-sm text-crypto-silver">
                  📱 Swipe-based prediction market interface
                  <br />
                  🎯 Social betting on crypto and trending topics
                  <br />
                  ⚡ Quick and simple market participation
                </p>
              </div>
            </div>
          </div>
          
          {/* Limitless Exchange */}
          <div className="mt-6">
            <div className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Limitless Exchange</h3>
                </div>
                <Button
                  onClick={() => openInNewTab("https://limitless.exchange/advanced")}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Limitless
                </Button>
              </div>
              <p className="text-crypto-silver mb-4">
                Predict future crypto and stocks prices with sophisticated trading features and analytics.
              </p>
              <div className="bg-black/20 rounded-lg p-4 border border-orange-500/20">
                <p className="text-sm text-crypto-silver">
                  📈 Advanced prediction market trading platform
                  <br />
                  💹 Crypto and stock price predictions
                  <br />
                  🎯 Sophisticated analytics and trading features
                </p>
              </div>
            </div>
          </div>
          
          {/* Overtime Markets */}
          <div className="mt-6">
            <div className="p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Overtime Markets</h3>
                </div>
                <Button
                  onClick={() => openInNewTab("https://www.overtimemarkets.xyz/markets?status=OpenMarkets&sport=Live")}
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Overtime
                </Button>
              </div>
              <p className="text-crypto-silver mb-4">
                Decentralized sports prediction markets with live betting on major sports events.
              </p>
              <div className="bg-black/20 rounded-lg p-4 border border-green-500/20">
                <p className="text-sm text-crypto-silver">
                  ⚽ Live sports prediction markets
                  <br />
                  🏀 Decentralized betting on NBA, NFL, Soccer, and more
                  <br />
                  📊 Real-time odds and transparent market mechanics
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}