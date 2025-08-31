import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BarChart3, ExternalLink, TrendingUp, Link2, Star, Wallet, TrendingDown, Globe, Layers, Activity } from 'lucide-react';
import { openSecureLink } from '@/utils/security';

// Safe Glass Card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20 ${className}`}>
    {children}
  </Card>
);

// Safe iframe component
const SafeIframe = ({ src, title, className = "" }: { src: string; title: string; className?: string }) => {
  return (
    <div className="w-full">
      <iframe
        src={src}
        title={title}
        className={`w-full h-[600px] rounded-lg border border-crypto-silver/20 ${className}`}
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
  );
};

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

export default function AlphaSection() {
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <Link2 className="w-8 h-8 text-yellow-400" style={{filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.3))'}} />
          </div>
          <h1 className="text-3xl font-bold text-white">Onchain Analytics</h1>
        </div>
        <p className="text-crypto-silver">Comprehensive blockchain data and intelligence</p>
      </div>

      {/* All analytics sections */}
      <div className="space-y-8">
        {/* Onchain - Artemis Analytics */}
        <GlassCard className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Artemis</h3>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                COMPREHENSIVE
              </Badge>
            </div>
            <button
              onClick={() => openInNewTab('https://app.artemisanalytics.com/')}
              className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm"
            >
              Open Full View →
            </button>
          </div>

          {/* Artemis Analytics Iframe */}
          <div className="mb-6">
            <SafeIframe
              src="https://app.artemisanalytics.com/"
              title="Artemis Analytics Dashboard"
              className="h-[400px] sm:h-[500px] lg:h-[600px]"
            />
          </div>

          {/* Nansen.ai */}
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h4 className="text-lg sm:text-xl font-semibold text-white">Nansen</h4>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  WHALE TRACKING
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://app.nansen.ai/')}
                className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
              >
                Open Full View →
              </button>
            </div>
            <div className="mb-6">
              <SafeIframe
                src="https://app.nansen.ai/"
                title="Nansen Analytics Dashboard"
                className="h-[400px] sm:h-[500px] lg:h-[600px]"
              />
            </div>
          </div>

          {/* Messari */}
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h4 className="text-lg sm:text-xl font-semibold text-white">Messari</h4>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  RESEARCH
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://messari.io/')}
                className="text-green-400 hover:text-green-300 text-xs sm:text-sm"
              >
                Open Full View →
              </button>
            </div>
            <div className="mb-6">
              <SafeIframe
                src="https://messari.io/"
                title="Messari Research Platform"
                className="h-[400px] sm:h-[500px] lg:h-[600px]"
              />
            </div>
          </div>

          {/* Other Analytics Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SafeLink
              href='https://ayaoracle.xyz/#agents_data'
              className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-indigo-400 font-semibold">Aya AI</h4>
              </div>
              <p className="text-gray-400 text-sm">Crypto AI Agent Analytics</p>
            </SafeLink>

            <SafeLink
              href='https://opensea.io/stats/tokens'
              className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-blue-400 font-semibold">OpenSea</h4>
              </div>
              <p className="text-gray-400 text-sm">Trending Altcoin Timeframes</p>
            </SafeLink>

            <SafeLink
              href='https://www.terminal.co/'
              className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-green-400 font-semibold">Terminal</h4>
              </div>
              <p className="text-gray-400 text-sm">Advanced Trading Terminal</p>
            </SafeLink>

            <SafeLink
              href='https://www.zoracle.xyz/'
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">Zoracle</h4>
              </div>
              <p className="text-gray-400 text-sm">Onchain Oracle Data</p>
            </SafeLink>
          </div>
        </GlassCard>

        {/* DexScreener Analytics */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">DexScreener</h3>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                LIVE CHARTS
              </Badge>
            </div>
            <button
              onClick={() => openInNewTab('https://dexscreener.com/')}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="mb-6">
            <SafeIframe
              src="https://dexscreener.com/"
              title="DexScreener Analytics"
              className="h-[600px]"
            />
          </div>
        </GlassCard>

        {/* DexCheck - Signal Section */}
        <GlassCard className="p-6">
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white">DexCheck.ai</h4>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  AI ANALYTICS
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://dexcheck.ai/app')}
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
              >
                Open Full View →
              </button>
            </div>
            <div className="mb-6">
              <SafeIframe
                src="https://dexcheck.ai/app"
                title="DexCheck.ai Analytics Dashboard"
                className="h-[600px]"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white">Alphanomics</h4>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  ANALYTICS
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://platform.alphanomics.io/')}
                className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open Full View →
              </button>
            </div>
            
            <div className="mb-6">
              <SafeIframe
                src="https://platform.alphanomics.io/"
                title="Alphanomics Analytics Platform"
                className="h-[600px]"
              />
            </div>
          </div>
        </GlassCard>

        {/* Trading Platforms */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Trading & Analytics</h3>
            <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white border-green-500/30 text-xs">
              PREMIUM TOOLS
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <SafeLink
              href='https://www.blockcreeper.com/'
              className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-orange-400 font-semibold">Blockcreeper</h4>
              </div>
              <p className="text-gray-400 text-sm">Blockchain Analytics & Tracking</p>
            </SafeLink>

            <SafeLink
              href='https://checkr.social/'
              className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-pink-400 font-semibold">Checkr</h4>
              </div>
              <p className="text-gray-400 text-sm">Social Analytics Platform</p>
            </SafeLink>

            <SafeLink
              href='https://creator.bid/agents'
              className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-cyan-400 font-semibold">Creator Bid</h4>
              </div>
              <p className="text-gray-400 text-sm">Creator Economy Platform</p>
            </SafeLink>

            <SafeLink
              href='https://bankr.bot/terminal'
              className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-yellow-400 font-semibold">Bankr Bot</h4>
              </div>
              <p className="text-gray-400 text-sm">Automated Trading Terminal</p>
            </SafeLink>

            <SafeLink
              href='https://zora.co/explore'
              className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-indigo-400 font-semibold">Zora</h4>
              </div>
              <p className="text-gray-400 text-sm">NFT Marketplace & Creator Tools</p>
            </SafeLink>

            <SafeLink
              href='https://app.virtuals.io/'
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">Virtuals</h4>
              </div>
              <p className="text-gray-400 text-sm">Virtual AI Agent Ecosystem</p>
            </SafeLink>
          </div>
        </GlassCard>

        {/* Smart Wallets */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Smart Wallets</h3>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              WHALE TRACKING
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <SafeLink
              href='https://indexy.xyz/home'
              className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-green-400 font-semibold">Indexy</h4>
              </div>
              <p className="text-gray-400 text-sm">Crypto market indexing platform</p>
            </SafeLink>

            <SafeLink
              href='https://hyperdash.info/trader/0x15b325660a1c4a9582a7d834c31119c0cb9e3a42'
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">HyperLiquid Whale</h4>
              </div>
              <p className="text-gray-400 text-sm">Hyperdash Trader Analytics</p>
            </SafeLink>

            <SafeLink
              href='https://debank.com/profile/0x3f135ba020d0ed288d8dd85cd3d600451b121013'
              className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-green-400 font-semibold">WhaleAI - ETH/BASE</h4>
              </div>
              <p className="text-gray-400 text-sm">DeBank Portfolio Analysis</p>
            </SafeLink>
          </div>

          {/* Social Intelligence */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white">Social Intelligence</h4>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                AI POWERED
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SafeLink
                href='https://yaps.kaito.ai/'
                className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-orange-400 font-semibold">Kaito</h4>
                </div>
                <p className="text-gray-400 text-sm">AI-Powered Social Intelligence</p>
              </SafeLink>

              <SafeLink
                href='https://app.kolytics.pro/leaderboard'
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-red-400 font-semibold">Kolytics</h4>
                </div>
                <p className="text-gray-400 text-sm">Social Signal Analytics</p>
              </SafeLink>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}