import { UniversalNavigation } from "@/components/universal-navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ExternalLink } from "lucide-react";
import { openSecureLink } from "@/utils/security";
import { useScrollFade } from "@/hooks/useScrollFade";
import diceImage from "@assets/istockphoto-1252690598-612x612_1756665072306.jpg";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";

// Safe components for external links
const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function PredictPage() {
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
            {/* Top-right crypto image */}
            <div className="hidden sm:flex items-center">
              <img 
                src={criptomonedas}
                alt="Crypto Coins"
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-lg"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="predict" />

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Polymarket</h3>
            </div>
            <Button
              onClick={() => openInNewTab('https://polymarket.com/crypto')}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Polymarket
            </Button>
          </div>
          <iframe
            src="https://polymarket.com/crypto"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Polymarket"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />

          {/* PredictBase */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-white mb-4">PredictBase</h3>
            <iframe
              src="https://predictbase.app/"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="PredictBase"
              frameBorder="0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Moby Screener Predictions */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-white mb-4">Moby Screener Predictions</h3>
            <iframe
              src="https://www.mobyscreener.com/predictions-feed"
              className="w-full h-[500px] rounded-lg border border-crypto-silver/20"
              title="Moby Screener Predictions"
              frameBorder="0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* TrueMarkets */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-white mb-4">TrueMarkets</h3>
            <iframe
              src="https://app.truemarkets.org/en/markets"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="TrueMarkets"
              frameBorder="0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
              referrerPolicy="no-referrer-when-downgrade"
            />
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
        </GlassCard>
      </main>
    </div>
  );
}