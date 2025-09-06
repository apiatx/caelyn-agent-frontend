import { UniversalNavigation } from "@/components/universal-navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Shield, Bot, ExternalLink, Zap, Lock, Users, ArrowUpRight } from "lucide-react";
import { openSecureLink } from '@/utils/security';
import onchainImage from "@assets/images_1756750962640.jpeg";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
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

export default function OnchainSmartWalletsPage() {
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
      <UniversalNavigation activePage="onchain-smart-wallets" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img 
                src={onchainImage} 
                alt="Smart Wallets" 
                className="w-12 h-12 rounded-xl object-cover"
              />
              <h1 className="text-3xl font-bold text-white">Smart Wallets</h1>
            </div>
            <p className="text-crypto-silver">Smart wallet analytics and whale tracking</p>
          </div>

          {/* Smart Wallets */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Smart Wallets</h3>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                ANALYTICS
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <SafeLink
                href='https://indexy.xyz/home'
                className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-green-400 font-semibold">Indexy</h4>
                </div>
                <p className="text-gray-400 text-sm">Crypto market indexing platform</p>
              </SafeLink>

              <SafeLink
                href='https://hyperdash.info/trader/0x15b325660a1c4a9582a7d834c31119c0cb9e3a42'
                className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-purple-400 font-semibold">HyperLiquid Whale</h4>
                </div>
                <p className="text-gray-400 text-sm">Hyperdash Trader Analytics</p>
              </SafeLink>

              <SafeLink
                href='https://debank.com/profile/0x3f135ba020d0ed288d8dd85cd3d600451b121013'
                className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-blue-400 font-semibold">WhaleAI - ETH/BASE</h4>
                </div>
                <p className="text-gray-400 text-sm">DeBank Portfolio Analysis</p>
              </SafeLink>

              <SafeLink
                href='https://debank.com/profile/0xb1058c959987e3513600eb5b4fd82aeee2a0e4f9'
                className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-orange-400 font-semibold">Debt Relief Bot</h4>
                </div>
                <p className="text-gray-400 text-sm">DeBank wallet tracker</p>
              </SafeLink>

              <SafeLink
                href='https://app.hyperliquid.xyz/vaults/0xe11b12a81ad743ae805078b0da61e9166475a829'
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-red-400 font-semibold">DegenAI HL Vault</h4>
                </div>
                <p className="text-gray-400 text-sm">Copy trading vault strategy</p>
              </SafeLink>

              <SafeLink
                href='https://degenai.dev/'
                className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-pink-400 font-semibold">DegenAI Perps Bot</h4>
                </div>
                <p className="text-gray-400 text-sm">AI-powered perpetual trading bot</p>
              </SafeLink>
            </div>

            <div className="mb-8">
              <iframe
                src="https://app.chainlyze.ai/smart-wallet"
                title="Chainlyze Smart Wallet Tracker"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                frameBorder="0"
                loading="lazy"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
                referrerPolicy="strict-origin-when-cross-origin"
                style={{
                  background: '#000000',
                  colorScheme: 'dark'
                }}
              />
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}