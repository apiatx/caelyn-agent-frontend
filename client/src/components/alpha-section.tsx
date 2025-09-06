import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BarChart3, ExternalLink, TrendingUp, Link2, Star, Wallet, TrendingDown, Globe, Layers, Activity } from 'lucide-react';
import { openSecureLink } from '@/utils/security';
import onchainImage from "@assets/images_1756750962640.jpeg";
import TopDailyGainersTop500 from './top-daily-gainers-top500';

// Safe Glass Card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-black/90 to-black/95 border border-white/20 ${className}`}>
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
          <img 
            src={onchainImage} 
            alt="Onchain" 
            className="w-12 h-12 rounded-xl object-cover"
          />
          <h1 className="text-3xl font-bold text-white">Onchain</h1>
        </div>
        <p className="text-crypto-silver">Comprehensive blockchain data and intelligence</p>
      </div>

      <div className="space-y-8">
        <GlassCard className="p-3 sm:p-4 lg:p-6">

          {/* Artemis */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => openInNewTab('https://app.artemisanalytics.com/')}
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open Full View
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://app.artemisanalytics.com/"
                title="Artemis Analytics Dashboard"
                className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
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
          </div>

          {/* Messari.io */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">M</span>
              </div>
            </div>
            <button
              onClick={() => openInNewTab('https://messari.io/')}
              className="w-full p-6 text-center bg-gradient-to-b from-orange-600/10 to-orange-700/10 hover:from-orange-600/20 hover:to-orange-700/20 border border-orange-600/20 hover:border-orange-500/40 rounded-lg transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-orange-300 mb-2">Messari.io</h4>
              <p className="text-gray-400 group-hover:text-gray-300 text-sm max-w-md mx-auto">Research reports, market data, and institutional-grade analysis</p>
            </button>
          </div>

        </GlassCard>

        {/* Top 20 Daily Gainers from CMC Top 500 */}
        <TopDailyGainersTop500 />
      </div>

      <div className="space-y-8 mt-12">
        <GlassCard className="p-3 sm:p-4 lg:p-6">

          {/* Signal */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">S</span>
              </div>
              <h4 className="text-white font-medium">Signal</h4>
              <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
                MULTI-CHAIN
              </Badge>
            </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <SafeLink
              href='https://dexcheck.ai/app'
              className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-green-400 font-semibold">DexCheck</h4>
              </div>
              <p className="text-gray-400 text-sm">Multi-chain analytics platform</p>
            </SafeLink>

            <SafeLink
              href='https://app.nansen.ai/'
              className="p-4 bg-purple-600/10 border border-purple-600/20 rounded-lg hover:bg-purple-600/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-purple-400 font-semibold">Nansen.ai</h4>
              </div>
              <p className="text-gray-400 text-sm">On-chain insights and wallet tracking</p>
            </SafeLink>

            <SafeLink
              href='https://mindshare.elfi.io/'
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-purple-400 font-semibold">Mindshare by Elfi</h4>
              </div>
              <p className="text-gray-400 text-sm">AI Token Analytics & Social Intelligence</p>
            </SafeLink>

            <SafeLink
              href='https://cookie.fun/'
              className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-yellow-400 font-semibold">Cookie.fun</h4>
              </div>
              <p className="text-gray-400 text-sm">Interactive Trading Platform</p>
            </SafeLink>

            <SafeLink
              href='https://dapp.velvet.capital/'
              className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-blue-400 font-semibold">Velvet Capital</h4>
              </div>
              <p className="text-gray-400 text-sm">DeFi Portfolio Management</p>
            </SafeLink>

            <SafeLink
              href='https://ayaoracle.xyz/#agents_data'
              className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-indigo-400 font-semibold">Aya AI</h4>
              </div>
              <p className="text-gray-400 text-sm">Crypto AI Agent Analytics</p>
            </SafeLink>

            <SafeLink
              href='https://opensea.io/stats/tokens'
              className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-cyan-400 font-semibold">OpenSea</h4>
              </div>
              <p className="text-gray-400 text-sm">Trending Altcoin Timeframes</p>
            </SafeLink>

            <SafeLink
              href='https://coinmarketcap.com/leaderboard/'
              className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-blue-400 font-semibold">CMC Leaderboard</h4>
              </div>
              <p className="text-gray-400 text-sm">Market Rankings</p>
            </SafeLink>

            <SafeLink
              href='https://www.coingecko.com/en/chains'
              className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-green-400 font-semibold">CoinGecko Chains</h4>
              </div>
              <p className="text-gray-400 text-sm">Blockchain Analytics</p>
            </SafeLink>
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
      </div>



      {/* Memecoins */}
      <div className="space-y-8 mt-12">
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🚀</span>
            </div>
            <h3 className="text-xl font-semibold text-white">Memecoins</h3>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              ANALYTICS
            </Badge>
          </div>

          {/* Capitoday */}
          <div className="mb-8">
            <SafeIframe
              src="https://capitoday.com/"
              title="Capitoday Memecoins Platform"
              className="h-[600px]"
            />
          </div>

          {/* HolderScan */}
          <div className="mb-8">
            <SafeIframe
              src="https://holderscan.com/"
              title="HolderScan Memecoins Analytics"
              className="h-[600px]"
            />
          </div>
        </GlassCard>
      </div>



      {/* Discover Web3 */}
      <div className="space-y-8 mt-12">
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <h3 className="text-xl font-semibold text-white">Discover Web3</h3>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              ECOSYSTEM
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SafeLink
              href='https://www.ethereum-ecosystem.com/'
              className="p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg hover:bg-gray-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">E</span>
                </div>
                <h4 className="text-gray-400 font-semibold">Ethereum Ecosystem</h4>
              </div>
              <p className="text-gray-400 text-sm">Comprehensive ecosystem guide</p>
            </SafeLink>

            <SafeLink
              href='https://academy.swissborg.com/en/learn/solana-ecosystem'
              className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <h4 className="text-indigo-400 font-semibold">Solana Ecosystem</h4>
              </div>
              <p className="text-gray-400 text-sm">SwissBorg Academy ecosystem guide</p>
            </SafeLink>

            <SafeLink
              href='https://www.base.org/ecosystem'
              className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">B</span>
                </div>
                <h4 className="text-cyan-400 font-semibold">Base Ecosystem</h4>
              </div>
              <p className="text-gray-400 text-sm">Official Base ecosystem directory</p>
            </SafeLink>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SafeLink
              href='https://gravity.xyz/'
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">G</span>
                </div>
                <h4 className="text-emerald-400 font-semibold">Gravity Ecosystem</h4>
              </div>
              <p className="text-gray-400 text-sm">Explore the Gravity network</p>
            </SafeLink>

            <SafeLink
              href='https://dappradar.com/'
              className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">D</span>
                </div>
                <h4 className="text-blue-400 font-semibold">DappRadar</h4>
              </div>
              <p className="text-gray-400 text-sm">Discover DApps & analytics</p>
            </SafeLink>

            <SafeLink
              href='https://zapper.xyz/'
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">Z</span>
                </div>
                <h4 className="text-purple-400 font-semibold">Zapper</h4>
              </div>
              <p className="text-gray-400 text-sm">DeFi portfolio management</p>
            </SafeLink>
          </div>
        </GlassCard>
      </div>

      {/* Inspect Tools - Moved to bottom as requested */}
      <div className="space-y-8 mt-12">
        <GlassCard className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">I</span>
            </div>
            <h4 className="text-white font-medium">Inspect</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => openInNewTab('https://chainspect.app/dashboard')}
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
            >
              <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Chainspect</div>
              <div className="text-xs text-crypto-silver">Chain scalability and decentralization analytics</div>
            </button>

            <button
              onClick={() => openInNewTab('https://tokenterminal.com/explorer')}
              className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
            >
              <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Token Terminal</div>
              <div className="text-xs text-crypto-silver">Protocol metrics explorer</div>
            </button>

            <button
              onClick={() => openInNewTab('https://www.theblock.co/data/decentralized-finance/dex-non-custodial')}
              className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
            >
              <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">The Block: DEX Metrics</div>
              <div className="text-xs text-crypto-silver">Comprehensive DEX analytics and metrics</div>
            </button>

            <button
              onClick={() => openInNewTab('https://www.developerreport.com/')}
              className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
            >
              <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">Developer Report</div>
              <div className="text-xs text-crypto-silver">Developer activity by blockchain</div>
            </button>
          </div>
        </GlassCard>
      </div>

    </div>
  );
}