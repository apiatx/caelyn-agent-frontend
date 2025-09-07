import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BarChart3, ExternalLink, TrendingUp, Link2, Star, Wallet, TrendingDown, Globe, Layers, Activity } from 'lucide-react';
import { openSecureLink } from '@/utils/security';
import onchainImage from "@assets/images_1756750962640.jpeg";
import diamondImage from "@assets/images (4)_1757213323269.jpeg";
import TopDailyGainersTop500 from './top-daily-gainers-top500';

// Enhanced Glass Card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-xl bg-gradient-to-br from-black/80 via-gray-900/60 to-black/90 border border-white/30 shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500 ${className}`}>
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
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="relative">
            <img 
              src={onchainImage} 
              alt="Analytics" 
              className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-blue-500/30 border-2 border-blue-400/50"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-400/20 to-purple-400/20"></div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-lg">Analytics</h1>
          <div className="relative">
            <img 
              src={diamondImage} 
              alt="Analytics Diamond" 
              className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-blue-500/30 border-2 border-blue-400/50 bg-black"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-400/20 to-purple-400/20"></div>
          </div>
        </div>
        <p className="text-lg text-gray-300 font-medium tracking-wide">Comprehensive onchain intelligence & analytics</p>
      </div>

      <div className="space-y-8">
        <GlassCard className="p-3 sm:p-4 lg:p-6">

          {/* Artemis */}
          <div className="mb-8">
            <div className="flex items-center justify-end mb-4">
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

        {/* 24h Gainers (CMC Top 500) */}
        <TopDailyGainersTop500 />
      </div>

      {/* Inspect Tools - Moved above Signal section and reordered */}
      <div className="space-y-8 mt-12">
        <GlassCard className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-sm">I</span>
            </div>
            <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">Inspect</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => openInNewTab('https://tokenterminal.com/explorer')}
              className="bg-gradient-to-br from-purple-500/15 to-purple-600/15 hover:from-purple-500/25 hover:to-purple-600/25 border border-purple-500/30 hover:border-purple-400/50 rounded-xl p-5 transition-all duration-300 text-left group shadow-lg hover:shadow-purple-500/20 hover:scale-105 transform"
            >
              <div className="text-base font-semibold text-white group-hover:text-purple-200 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full group-hover:animate-pulse"></div>
                Token Terminal
              </div>
              <div className="text-sm text-gray-300 group-hover:text-gray-200">Protocol metrics explorer</div>
            </button>

            <button
              onClick={() => openInNewTab('https://www.developerreport.com/')}
              className="bg-gradient-to-br from-green-500/15 to-green-600/15 hover:from-green-500/25 hover:to-green-600/25 border border-green-500/30 hover:border-green-400/50 rounded-xl p-5 transition-all duration-300 text-left group shadow-lg hover:shadow-green-500/20 hover:scale-105 transform"
            >
              <div className="text-base font-semibold text-white group-hover:text-green-200 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full group-hover:animate-pulse"></div>
                Developer Report
              </div>
              <div className="text-sm text-gray-300 group-hover:text-gray-200">Developer activity by blockchain</div>
            </button>

            <button
              onClick={() => openInNewTab('https://www.theblock.co/data/decentralized-finance/dex-non-custodial')}
              className="bg-gradient-to-br from-orange-500/15 to-orange-600/15 hover:from-orange-500/25 hover:to-orange-600/25 border border-orange-500/30 hover:border-orange-400/50 rounded-xl p-5 transition-all duration-300 text-left group shadow-lg hover:shadow-orange-500/20 hover:scale-105 transform"
            >
              <div className="text-base font-semibold text-white group-hover:text-orange-200 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full group-hover:animate-pulse"></div>
                The Block: DEX Metrics
              </div>
              <div className="text-sm text-gray-300 group-hover:text-gray-200">Comprehensive DEX analytics and metrics</div>
            </button>

            <button
              onClick={() => openInNewTab('https://chainspect.app/dashboard')}
              className="bg-gradient-to-br from-cyan-500/15 to-cyan-600/15 hover:from-cyan-500/25 hover:to-cyan-600/25 border border-cyan-500/30 hover:border-cyan-400/50 rounded-xl p-5 transition-all duration-300 text-left group shadow-lg hover:shadow-cyan-500/20 hover:scale-105 transform"
            >
              <div className="text-base font-semibold text-white group-hover:text-cyan-200 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full group-hover:animate-pulse"></div>
                Chainspect
              </div>
              <div className="text-sm text-gray-300 group-hover:text-gray-200">Chain scalability and decentralization analytics</div>
            </button>
          </div>
        </GlassCard>
      </div>

      <div className="space-y-8 mt-12">
        <GlassCard className="p-3 sm:p-4 lg:p-6">

          {/* Signal */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent">Signal</h4>
            </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Top priority: CMC Leaderboard, OpenSea, CoinGecko Chains */}
            <SafeLink
              href='https://coinmarketcap.com/leaderboard/'
              className="p-5 bg-gradient-to-br from-blue-500/15 to-blue-600/15 hover:from-blue-500/25 hover:to-blue-600/25 border border-blue-500/30 hover:border-blue-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <h4 className="text-blue-300 font-bold text-lg">CMC Leaderboard</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">Market Rankings</p>
            </SafeLink>

            <SafeLink
              href='https://opensea.io/stats/tokens'
              className="p-5 bg-gradient-to-br from-cyan-500/15 to-cyan-600/15 hover:from-cyan-500/25 hover:to-cyan-600/25 border border-cyan-500/30 hover:border-cyan-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-cyan-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">O</span>
                </div>
                <h4 className="text-cyan-300 font-bold text-lg">OpenSea</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">Trending Altcoin Timeframes</p>
            </SafeLink>

            <SafeLink
              href='https://www.coingecko.com/en/chains'
              className="p-5 bg-gradient-to-br from-green-500/15 to-green-600/15 hover:from-green-500/25 hover:to-green-600/25 border border-green-500/30 hover:border-green-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">G</span>
                </div>
                <h4 className="text-green-300 font-bold text-lg">CoinGecko Chains</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">Blockchain Analytics</p>
            </SafeLink>

            {/* Rest of the analytics tools */}
            <SafeLink
              href='https://dexcheck.ai/app'
              className="p-5 bg-gradient-to-br from-emerald-500/15 to-emerald-600/15 hover:from-emerald-500/25 hover:to-emerald-600/25 border border-emerald-500/30 hover:border-emerald-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">D</span>
                </div>
                <h4 className="text-emerald-300 font-bold text-lg">DexCheck</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">Multi-chain analytics platform</p>
            </SafeLink>

            <SafeLink
              href='https://app.nansen.ai/'
              className="p-5 bg-gradient-to-br from-purple-600/15 to-purple-700/15 hover:from-purple-600/25 hover:to-purple-700/25 border border-purple-600/30 hover:border-purple-500/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-600/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">N</span>
                </div>
                <h4 className="text-purple-300 font-bold text-lg">Nansen.ai</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">On-chain insights and wallet tracking</p>
            </SafeLink>

            <SafeLink
              href='https://mindshare.elfi.io/'
              className="p-5 bg-gradient-to-br from-violet-500/15 to-violet-600/15 hover:from-violet-500/25 hover:to-violet-600/25 border border-violet-500/30 hover:border-violet-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-violet-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">M</span>
                </div>
                <h4 className="text-violet-300 font-bold text-lg">Mindshare by Elfi</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">AI Token Analytics & Social Intelligence</p>
            </SafeLink>

            <SafeLink
              href='https://cookie.fun/'
              className="p-5 bg-gradient-to-br from-yellow-500/15 to-yellow-600/15 hover:from-yellow-500/25 hover:to-yellow-600/25 border border-yellow-500/30 hover:border-yellow-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-yellow-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <h4 className="text-yellow-300 font-bold text-lg">Cookie.fun</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">Interactive Trading Platform</p>
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

      {/* Discover Web3 */}
      <div className="space-y-8 mt-12">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">Discover Web3</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SafeLink
              href='https://www.ethereum-ecosystem.com/'
              className="p-5 bg-gradient-to-br from-gray-600/15 to-gray-700/15 hover:from-gray-600/25 hover:to-gray-700/25 border border-gray-500/30 hover:border-gray-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-gray-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">E</span>
                </div>
                <h4 className="text-gray-200 font-bold text-lg">Ethereum Ecosystem</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">Comprehensive ecosystem guide</p>
            </SafeLink>

            <SafeLink
              href='https://academy.swissborg.com/en/learn/solana-ecosystem'
              className="p-5 bg-gradient-to-br from-indigo-500/15 to-indigo-600/15 hover:from-indigo-500/25 hover:to-indigo-600/25 border border-indigo-500/30 hover:border-indigo-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-indigo-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">S</span>
                </div>
                <h4 className="text-indigo-300 font-bold text-lg">Solana Ecosystem</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">SwissBorg Academy ecosystem guide</p>
            </SafeLink>

            <SafeLink
              href='https://www.base.org/ecosystem'
              className="p-5 bg-gradient-to-br from-cyan-500/15 to-cyan-600/15 hover:from-cyan-500/25 hover:to-cyan-600/25 border border-cyan-500/30 hover:border-cyan-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-cyan-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">B</span>
                </div>
                <h4 className="text-cyan-300 font-bold text-lg">Base Ecosystem</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">Official Base ecosystem directory</p>
            </SafeLink>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SafeLink
              href='https://gravity.xyz/'
              className="p-5 bg-gradient-to-br from-emerald-500/15 to-emerald-600/15 hover:from-emerald-500/25 hover:to-emerald-600/25 border border-emerald-500/30 hover:border-emerald-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">G</span>
                </div>
                <h4 className="text-emerald-300 font-bold text-lg">Gravity Ecosystem</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">Explore the Gravity network</p>
            </SafeLink>

            <SafeLink
              href='https://dappradar.com/'
              className="p-5 bg-gradient-to-br from-blue-500/15 to-blue-600/15 hover:from-blue-500/25 hover:to-blue-600/25 border border-blue-500/30 hover:border-blue-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">D</span>
                </div>
                <h4 className="text-blue-300 font-bold text-lg">DappRadar</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">Discover DApps & analytics</p>
            </SafeLink>

            <SafeLink
              href='https://zapper.xyz/'
              className="p-5 bg-gradient-to-br from-purple-500/15 to-purple-600/15 hover:from-purple-500/25 hover:to-purple-600/25 border border-purple-500/30 hover:border-purple-400/50 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-500/20 transform"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">Z</span>
                </div>
                <h4 className="text-purple-300 font-bold text-lg">Zapper</h4>
              </div>
              <p className="text-gray-300 text-sm font-medium">DeFi portfolio management</p>
            </SafeLink>
          </div>
        </GlassCard>
      </div>

      {/* Memecoins */}
      <div className="space-y-8 mt-12">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white text-xl">🚀</span>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent">Memecoins</h3>
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

    </div>
  );
}