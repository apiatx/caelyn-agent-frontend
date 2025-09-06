import { UniversalNavigation } from "@/components/universal-navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ExternalLink } from "lucide-react";
import { openSecureLink } from "@/utils/security";
import { useScrollFade } from "@/hooks/useScrollFade";
import diceImage from "@assets/istockphoto-1252690598-612x612_1756665072306.jpg";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";

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
            backgroundImage: `url(${paintColorsBackground})`,
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
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="predict" />

      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-orange-400 shadow-lg">
              <img 
                src={diceImage}
                alt="Prediction Markets"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
              Prediction Markets
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Prediction Markets Section */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={() => openInNewTab('https://polymarket.com/crypto')}
              className="text-orange-400 hover:text-orange-300 text-sm"
            >
              Open Full View →
            </button>
          </div>
          <iframe
            src="https://polymarket.com/crypto"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Polymarket Crypto"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />

          {/* Moby Screener Predictions */}
          <div className="mt-6">
            <div className="p-6 bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Moby Screener Predictions</h3>
                </div>
                <Button
                  onClick={() => openInNewTab("https://www.mobyscreener.com/predictions-feed")}
                  className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Full View
                </Button>
              </div>
              <iframe
                src="https://www.mobyscreener.com/predictions-feed"
                className="w-full h-[500px] rounded-lg border border-green-500/20"
                title="Moby Screener Predictions"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                referrerPolicy="no-referrer-when-downgrade"
              />
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
          
          <div className="mt-6">
            <div className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">Limitless Exchange</h4>
                    <p className="text-sm text-crypto-silver">Predict future crypto and stocks prices</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30">
                  ADVANCED
                </Badge>
              </div>
              <p className="text-crypto-silver mb-4 text-sm">
                Predict future crypto and stocks prices with sophisticated trading features and analytics.
              </p>
              <Button
                variant="outline"
                onClick={() => openInNewTab('https://limitless.exchange/advanced')}
                className="w-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30 hover:bg-orange-500/30 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Limitless Exchange Platform
              </Button>
            </div>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}