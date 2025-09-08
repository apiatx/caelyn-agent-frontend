import { UniversalNavigation } from "@/components/universal-navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, TrendingUp, Hash, ExternalLink, Bot, Zap, Heart, Star } from "lucide-react";
import { openSecureLink } from '@/utils/security';
import socialImage from "@assets/download (4)_1757214892954.png";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
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

          {/* Main Social Section */}
          <GlassCard className="p-6">

            {/* CryptoX Subsection */}
            <div className="mb-12">
              <div className="flex items-center justify-center mb-6">
                <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">CryptoX</h4>
              </div>


              {/* Investors Subsection */}
              <GlassCard className="mb-6 p-4">
                <div className="flex items-center justify-center mb-6">
                  <h4 className="text-xl font-bold bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">Investors</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    'TechDev_52', 'ofvoice25355', 'CoinGurruu', 'stacy_muur', 
                    'martypartymusic', 'Defi0xJeff', 'altcoinvector', 'DeFi_Paanda', 
                    'cryptorinweb3', 'jkrdoc', 'Agent_rsch', 'OverkillTrading', 
                    'dontbuytops', 'MetaverseRanger', 'aixCB_Vc'
                  ].map((account) => {
                    return (
                    <SafeLink
                      key={account}
                      href={`https://x.com/${account}`}
                      className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold text-sm">𝕏</span>
                        <span className="text-green-400 font-semibold text-sm">{account}</span>
                      </div>
                    </SafeLink>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Traders Subsection */}
              <GlassCard className="mb-6 p-4">
                <div className="flex items-center justify-center mb-6">
                  <h4 className="text-xl font-bold bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">Traders</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    'TheEuroSniper', 'EricCryptoman', 'Whale_AI_net', 'CryptoThannos', 
                    'HolderScan', 'Ethimedes', 'MisterSpread', 'CBATrades', 'DigimonCBA'
                  ].map((account) => {
                    return (
                    <SafeLink
                      key={account}
                      href={`https://x.com/${account}`}
                      className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 font-bold text-sm">𝕏</span>
                        <span className="text-yellow-400 font-semibold text-sm">{account}</span>
                      </div>
                    </SafeLink>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Thoughts & Opinions Subsection */}
              <GlassCard className="mb-6 p-4">
                <div className="flex items-center justify-center mb-6">
                  <h4 className="text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">Thoughts & Opinions</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    'CryptoZer0_'
                  ].map((account) => {
                    return (
                    <SafeLink
                      key={account}
                      href={`https://x.com/${account}`}
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
              </GlassCard>

              {/* Market Today Subsection */}
              <GlassCard className="mb-6 p-4">
                <div className="flex items-center justify-center mb-6">
                  <h4 className="text-xl font-bold bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent">Market Today</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    'aicryptopattern'
                  ].map((account) => {
                    return (
                    <SafeLink
                      key={account}
                      href={`https://x.com/${account}`}
                      className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-orange-400 font-bold text-sm">𝕏</span>
                        <span className="text-orange-400 font-semibold text-sm">{account}</span>
                      </div>
                    </SafeLink>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Chains Subsection */}
              <GlassCard className="mb-6 p-4">
                <div className="flex items-center justify-center mb-6">
                  <h4 className="text-xl font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">Chains</h4>
                </div>
                
                {/* Base and Solana Ecosystems - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Base Ecosystem */}
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-center mb-6">
                      <h4 className="text-lg font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">Base Ecosystem</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SafeLink
                        href='https://x.com/BaseDailyTK'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">Base Daily TK</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@BaseDailyTK - Daily BASE network updates and insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/MemesOnBase'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">Memes On Base</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@MemesOnBase - BASE network meme culture and community</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/MemesOnBase_'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">Memes On Base</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@MemesOnBase_ - BASE network meme culture and trends</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/Shake51_'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">Shake51</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@Shake51_ - BASE network trading insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/1CrypticPoet'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">CrypticPoet</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@1CrypticPoet - BASE network alpha and trading signals</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/jamatto14'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">Jamatto14</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@jamatto14 - BASE network insights and updates</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/MrGreen_18'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">MrGreen_18</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@MrGreen_18 - BASE network trading signals and alpha</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/chironchain'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">chironchain</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@chironchain - BASE network insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/goodvimonly'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">goodvimonly</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@goodvimonly - BASE network analysis</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/0x_tesseract'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">0x_tesseract</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@0x_tesseract - BASE network trading</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/Prometheus_The1'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">Prometheus_The1</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@Prometheus_The1 - BASE network insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/lil_louieT'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">lil_louieT</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@lil_louieT - BASE network trading</div>
                      </SafeLink>
                    </div>
                  </GlassCard>

                  {/* Solana Ecosystem */}
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-center mb-6">
                      <h4 className="text-lg font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">Solana Ecosystem</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SafeLink
                        href='https://x.com/Dior100x'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">Dior100x</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@Dior100x - Solana trading insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/_Shadow36'
                        className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg hover:bg-gray-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-400 font-bold text-sm">𝕏</span>
                          <span className="text-gray-400 font-semibold text-sm">_Shadow36</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@_Shadow36 - Solana market analysis</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/WolverCrypto'
                        className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-yellow-400 font-bold text-sm">𝕏</span>
                          <span className="text-yellow-400 font-semibold text-sm">WolverCrypto</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@WolverCrypto - Crypto trading insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/watchingmarkets'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">watchingmarkets</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@watchingmarkets - Market watching insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/Crypto_Alch'
                        className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-400 font-bold text-sm">𝕏</span>
                          <span className="text-green-400 font-semibold text-sm">Crypto_Alch</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@Crypto_Alch - Crypto alchemy insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/bruhbearr'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">bruhbearr</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@bruhbearr - Solana trading insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/AltcoinMarksman'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">AltcoinMarksman</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@AltcoinMarksman - Solana market analysis</div>
                      </SafeLink>
                    </div>
                  </GlassCard>
                </div>

                {/* Bittensor and Abstract Ecosystems - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bittensor Ecosystem */}
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-center mb-6">
                      <h4 className="text-lg font-bold bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent">Bittensor Ecosystem</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SafeLink
                        href='https://x.com/tao_agent'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">TAO Agent</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@tao_agent - Bittensor Signal Intelligence</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/Bitcast_network'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">Bitcast Network</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@Bitcast_network - TAO Network Analytics</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/TaoStacker'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">TaoStacker</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@TaoStacker - TAO Staking Insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/TaoIsTheKey'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">TaoIsTheKey</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@TaoIsTheKey - TAO Market Analysis</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/varimotrades'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">VARiMOtrading</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@varimotrades - TAO Trading Signals</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/_g_x_g'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">GXG</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@_g_x_g - Bittensor Intelligence</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/Shogun__base'
                        className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg hover:bg-gray-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-400 font-bold text-sm">𝕏</span>
                          <span className="text-gray-400 font-semibold text-sm">Shogun Base</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@Shogun__base - Base Network Trading</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/Victor_crypto_2'
                        className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-400 font-bold text-sm">𝕏</span>
                          <span className="text-green-400 font-semibold text-sm">Victor Crypto</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@Victor_crypto_2 - Crypto Market Analysis</div>
                      </SafeLink>
                    </div>
                  </GlassCard>

                  {/* Abstract Ecosystem */}
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-center mb-6">
                      <h4 className="text-lg font-bold bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent">Abstract Ecosystem</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SafeLink
                        href='https://x.com/AbstractChain'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">AbstractChain</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@AbstractChain - Official Abstract Chain updates</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/MemesAbstract'
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold text-sm">𝕏</span>
                          <span className="text-purple-400 font-semibold text-sm">MemesAbstract</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@MemesAbstract - Abstract ecosystem memes</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/ProofOfEly'
                        className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-400 font-bold text-sm">𝕏</span>
                          <span className="text-green-400 font-semibold text-sm">ProofOfEly</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@ProofOfEly - Abstract trading insights</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/AbstractHubHB'
                        className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-orange-400 font-bold text-sm">𝕏</span>
                          <span className="text-orange-400 font-semibold text-sm">AbstractHubHB</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@AbstractHubHB - Abstract Hub community</div>
                      </SafeLink>

                      <SafeLink
                        href='https://x.com/Abstract_Eco'
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 font-bold text-sm">𝕏</span>
                          <span className="text-blue-400 font-semibold text-sm">Abstract_Eco</span>
                        </div>
                        <div className="text-xs text-crypto-silver">@Abstract_Eco - Abstract ecosystem updates</div>
                      </SafeLink>
                    </div>
                  </GlassCard>
                </div>
              </GlassCard>

              {/* StocksX */}
              <GlassCard className="mb-6 p-4">
                <div className="flex items-center justify-center mb-6">
                  <h4 className="text-xl font-bold bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">StocksX</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { name: 'RebellioMarket', handle: '@RebellioMarket' },
                    { name: 'StocksToTrade', handle: '@StocksToTrade' },
                    { name: 'Timothy Sykes', handle: '@timothysykes' },
                    { name: 'Parangiras', handle: '@Parangiras' },
                    { name: 'Real Sheep Wolf', handle: '@realsheepwolf' },
                    { name: 'Eric Jackson', handle: '@ericjackson' },
                    { name: 'The Long Invest', handle: '@TheLongInvest' },
                    { name: 'Davy', handle: '@davyy888' },
                    { name: 'PMDiChristina', handle: '@PMDiChristina' },
                    { name: 'Joel Goes Digital', handle: '@JoelGoesDigital' },
                    { name: 'Scot1andT', handle: '@Scot1andT' },
                    { name: 'MACD Master', handle: '@MACDMaster328' },
                    { name: 'Spartan Trading', handle: '@SpartanTrading' },
                    { name: 'Planert41', handle: '@planert41' },
                    { name: 'Maximus Holla', handle: '@Maximus_Holla' },
                    { name: 'Canton Meow', handle: '@cantonmeow' },
                    { name: 'Donald J Dean', handle: '@donaldjdean' },
                    { name: 'AC Investor Blog', handle: '@ACInvestorBlog' },
                    { name: 'Cestrian Inc', handle: '@CestrianInc' },
                    { name: 'Invest In Assets', handle: '@InvestInAssets' },
                    { name: 'Invest Insights', handle: '@investinsights4' },
                    { name: 'Bits and Bips', handle: '@bitsandbips' },
                    { name: 'BKnight221', handle: '@BKnight221' },
                    { name: 'NFT Lunatic', handle: '@NFTLunatic' },
                    { name: 'AllISeeIs_W', handle: '@alliseeis_W' }
                  ].map((account) => {
                    const getAccountUrl = (handle: string) => {
                      return `https://x.com/${handle.replace('@', '')}`;
                    };

                    return (
                    <SafeLink
                      key={account.handle}
                      href={getAccountUrl(account.handle)}
                      className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold text-sm">𝕏</span>
                        <span className="text-green-400 font-semibold text-sm">{account.name}</span>
                      </div>
                    </SafeLink>
                    );
                  })}
                </div>
              </GlassCard>

            </div>

          </GlassCard>

          {/* Social Platforms */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Platforms</h3>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                SOCIAL MEDIA
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <h4 className="text-blue-400 font-semibold">X</h4>
                </div>
                <p className="text-gray-400 text-sm">Social Media & News Feed</p>
              </SafeLink>

              <SafeLink
                href='https://farcaster.xyz/'
                className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">🌐</span>
                  </div>
                  <h4 className="text-purple-400 font-semibold">Farcaster</h4>
                </div>
                <p className="text-gray-400 text-sm">Decentralized Social Network</p>
              </SafeLink>
            </div>
          </GlassCard>

          {/* Social Analytics */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Analytics</h3>
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
          </GlassCard>

          {/* Social Indexes on Base Section */}
          <GlassCard className="p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">Social Indexes on Base</h4>
                <Badge className="bg-green-500/30 text-green-200 border-green-400/40 px-3 py-1 font-semibold">
                  FEATURED
                </Badge>
              </div>
              <p className="text-green-200/80 text-lg font-medium">Advanced social intelligence and market indexing for Base ecosystem</p>
            </div>
            
            <SafeLink
              href='https://indexy.xyz/home'
              className="group w-full bg-gradient-to-br from-green-500/40 via-emerald-500/30 to-teal-500/40 border border-green-400/50 hover:from-green-400/50 hover:via-emerald-400/40 hover:to-teal-400/50 hover:border-green-300/70 text-white justify-center p-8 h-auto rounded-xl transition-all duration-500 flex items-center shadow-2xl hover:shadow-green-500/40 transform hover:scale-105 backdrop-blur-sm block"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/30 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-8 h-8 text-white group-hover:rotate-12 transition-transform duration-300" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-green-100 group-hover:text-white transition-colors duration-300 mb-2">Indexy</h4>
                    <Badge className="bg-green-400/30 text-green-100 border-green-300/40 px-4 py-2 font-bold text-sm">
                      PREMIUM PLATFORM
                    </Badge>
                  </div>
                </div>
                <p className="text-green-100/90 text-lg font-medium mb-4 max-w-2xl mx-auto leading-relaxed">
                  Professional-grade crypto market indexing platform with advanced social intelligence, 
                  real-time sentiment analysis, and comprehensive Base ecosystem tracking
                </p>
                <div className="flex items-center justify-center gap-6 text-sm text-green-200/80">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    <span>Social Analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Market Indexes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    <span>Base Ecosystem</span>
                  </div>
                </div>
              </div>
            </SafeLink>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}