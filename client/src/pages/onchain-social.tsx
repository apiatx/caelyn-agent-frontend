import { UniversalNavigation } from "@/components/universal-navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, TrendingUp, Hash, ExternalLink, Bot, Zap, Heart, Star } from "lucide-react";
import { openSecureLink } from '@/utils/security';
import socialImage from "@assets/download (4)_1757214892954.png";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import { useScrollFade } from "@/hooks/useScrollFade";

// Safe Glass Card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-black/90 to-black/95 border border-white/20 ${className}`}>
    {children}
  </Card>
);

interface SafeLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const SafeLink: React.FC<SafeLinkProps> = ({ href, children, className = "" }) => {
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

  return (
    <button onClick={() => openInNewTab(href)} className={className}>
      {children}
    </button>
  );
};

export default function OnchainSocialPage() {
  const headerOpacity = useScrollFade(30, 120);
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

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
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="onchain-social" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-8">
          {/* Social Section - Enhanced Header */}
          <div className="text-center relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 blur-3xl -z-10"></div>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img 
                  src={socialImage} 
                  alt="Social" 
                  className="w-28 h-28 object-cover"
                />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-pink-200 to-purple-200 bg-clip-text text-transparent">Social</h2>
            </div>
            <p className="text-lg text-white/80 font-medium tracking-wide">Social intelligence and community analytics</p>
            <div className="w-32 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Social Intelligence */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Social Intelligence</h3>
              <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
                ANALYTICS
              </Badge>
            </div>

            {/* CryptoX Subsection */}
            <div className="mb-12">
              <div className="flex items-center justify-center mb-6">
                <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">CryptoX</h4>
              </div>

              {/* X Accounts */}
              <div className="mb-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                  {[
                    'TechDev_52', 'Market Watcher', 'WolverCrypto', 'altcoinvector', 'AltcoinMarksman',
                    'Voice of the Gods', 'CoinGurruu', 'CryptoZer0_', 'DeFi_Paanda', 'aicryptopattern',
                    'bittybitbit86', 'Ethimedes', 'Whale_AI_net', 'Defi0xJeff', 'EricCryptoman',
                    'cryptorinweb3', 'OverkillTrading', 'jkrdoc', 'chironchain', 'goodvimonly',
                    'Agent_rsch', 'dontbuytops', 'bruhbearr', 'MetaverseRanger', 'Shake51_',
                    '0x_tesseract', 'TheEuroSniper', 'CryptoThannos', 'stacy_muur', 'martypartymusic',
                    'HolderScan'
                  ].map((account) => {
                    // Special mapping for accounts with different URLs
                    const getAccountUrl = (accountName: string) => {
                      if (accountName === 'Market Watcher') {
                        return 'https://x.com/watchingmarkets';
                      }
                      return `https://x.com/${accountName}`;
                    };

                    return (
                    <SafeLink
                      key={account}
                      href={getAccountUrl(account)}
                      className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-bold text-sm">𝕏</span>
                        <span className="text-blue-400 font-semibold text-sm">{account}</span>
                      </div>
                    </SafeLink>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* StockX Subsection */}
            <div className="mb-12">
              <div className="flex items-center justify-center mb-6">
                <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">StockX</h4>
              </div>
              <div className="text-center text-gray-400 py-8">
                <p>Stock social intelligence coming soon...</p>
              </div>
            </div>

            {/* CryptoStockX Subsection */}
            <div className="mb-12">
              <div className="flex items-center justify-center mb-6">
                <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">CryptoStockX</h4>
              </div>
              <div className="text-center text-gray-400 py-8">
                <p>Crypto-stock social intelligence coming soon...</p>
              </div>
            </div>

            {/* Social Platforms */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <h4 className="text-lg font-semibold text-white">Platforms</h4>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  SOCIAL MEDIA
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SafeLink
                  href='https://substack.com/'
                  className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">📰</span>
                    </div>
                    <h4 className="text-orange-400 font-semibold">Substack</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Newsletter Publishing Platform</p>
                </SafeLink>

                <SafeLink
                  href='https://x.com/home'
                  className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">𝕏</span>
                    </div>
                    <h4 className="text-blue-400 font-semibold">X Home</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Social Media & News Feed</p>
                </SafeLink>
              </div>
            </div>

            {/* Social Analytics */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <h4 className="text-lg font-semibold text-white">Analytics</h4>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  AI POWERED
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SafeLink
                  href='https://yaps.kaito.ai/'
                  className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-orange-400 font-semibold">Kaito</h4>
                  </div>
                  <p className="text-gray-400 text-sm">AI-Powered Social Intelligence</p>
                </SafeLink>

                <SafeLink
                  href='https://app.kolytics.pro/leaderboard'
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-red-400 font-semibold">Kolytics</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Social Signal Analytics</p>
                </SafeLink>

                <SafeLink
                  href='https://www.alphabot.app/pulse'
                  className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-blue-400 font-semibold">Alphabot</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Social Sentiment Bot</p>
                </SafeLink>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}