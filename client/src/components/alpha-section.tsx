import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BarChart3, ExternalLink, TrendingUp, Link2, Star, Wallet, TrendingDown, Globe, Layers, Activity, Brain } from 'lucide-react';
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
              className="w-20 h-20 rounded-full object-cover shadow-lg shadow-blue-500/30 border-2 border-blue-400/50"
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-400/20 to-purple-400/20"></div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-lg">Onchain</h1>
        </div>
        <p className="text-lg text-gray-300 font-medium tracking-wide">Comprehensive onchain intelligence & data</p>
      </div>



      <div className="space-y-8 mt-12">
        <GlassCard className="p-3 sm:p-4 lg:p-6">

          {/* Screening Section - Side by Side Layout */}
          <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
            {/* 24h Gainers (CMC Top 500) - Left Side */}
            <div className="lg:w-1/3 flex">
              <div className="w-full">
                <TopDailyGainersTop500 />
              </div>
            </div>

            {/* AskSurf and SAG3.ai - Right Side Stacked */}
            <div className="lg:w-2/3 flex flex-col gap-3">
              {/* AskSurf AI Hub */}
              <div className="flex-1 bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <iframe
                  src="https://asksurf.ai/hub"
                  className="w-full h-full min-h-[400px] rounded-lg border border-crypto-silver/20"
                  title="AskSurf AI Hub"
                  frameBorder="0"
                  loading="eager"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  data-testid="iframe-asksurf"
                />
              </div>

              {/* SAG3.ai Analysis */}
              <div className="flex-1 bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <iframe
                  src="https://sag3.ai/analyze"
                  className="w-full h-full min-h-[400px] rounded-lg border border-crypto-silver/20"
                  title="SAG3.ai Analysis"
                  frameBorder="0"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                  referrerPolicy="no-referrer-when-downgrade"
                  data-testid="iframe-sag3"
                />
              </div>
            </div>
          </div>

          {/* Nansen, Messari, Cookie - Three Across */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 mt-8">
            <SafeLink
              href='https://app.nansen.ai/'
              className="p-3 bg-gradient-to-br from-purple-600/15 to-purple-700/15 hover:from-purple-600/25 hover:to-purple-700/25 border border-purple-600/30 hover:border-purple-500/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-600/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">N</span>
                </div>
                <h4 className="text-purple-300 font-bold text-sm">Nansen.ai</h4>
              </div>
            </SafeLink>

            <button
              onClick={() => openInNewTab('https://messari.io/')}
              className="p-3 bg-gradient-to-b from-orange-600/10 to-orange-700/10 hover:from-orange-600/20 hover:to-orange-700/20 border border-orange-600/20 hover:border-orange-500/40 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-orange-500/20 transform group"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-orange-300 font-bold text-sm group-hover:text-orange-200">Messari.io</h4>
              </div>
            </button>

            <SafeLink
              href='https://cookie.fun/'
              className="p-3 bg-gradient-to-br from-yellow-500/15 to-yellow-600/15 hover:from-yellow-500/25 hover:to-yellow-600/25 border border-yellow-500/30 hover:border-yellow-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-yellow-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <h4 className="text-yellow-300 font-bold text-sm">Cookie.fun</h4>
              </div>
            </SafeLink>
          </div>

          {/* CoinGlass iframe */}
          <div className="mb-8">
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => openInNewTab('https://www.coinglass.com/')}
                className="text-blue-300 hover:text-blue-200 text-sm font-medium hover:underline transition-colors duration-300 flex items-center gap-1"
                data-testid="button-coinglass-external"
              >
                Open Full View →
              </button>
            </div>
            <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
              <iframe
                src="https://www.coinglass.com/"
                className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                title="CoinGlass"
                frameBorder="0"
                scrolling="yes"
              />
            </div>
          </div>

          {/* Screeners - Combined in same card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <SafeLink
              href='https://coinmarketcap.com/?type=coins&tableRankBy=trending_all_24h'
              className="p-3 bg-gradient-to-br from-blue-500/15 to-blue-600/15 hover:from-blue-500/25 hover:to-blue-600/25 border border-blue-500/30 hover:border-blue-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <h4 className="text-blue-300 font-bold text-sm">CMC</h4>
              </div>
            </SafeLink>

            <SafeLink
              href='https://www.coingecko.com/'
              className="p-3 bg-gradient-to-br from-green-500/15 to-green-600/15 hover:from-green-500/25 hover:to-green-600/25 border border-green-500/30 hover:border-green-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">G</span>
                </div>
                <h4 className="text-green-300 font-bold text-sm">CoinGecko</h4>
              </div>
            </SafeLink>

            <SafeLink
              href='https://opensea.io/stats/tokens'
              className="p-3 bg-gradient-to-br from-cyan-500/15 to-cyan-600/15 hover:from-cyan-500/25 hover:to-cyan-600/25 border border-cyan-500/30 hover:border-cyan-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-cyan-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">O</span>
                </div>
                <h4 className="text-cyan-300 font-bold text-sm">OpenSea</h4>
              </div>
            </SafeLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <SafeLink
              href='https://dex.coinmarketcap.com/token/all/'
              className="p-3 bg-gradient-to-br from-blue-500/15 to-blue-600/15 hover:from-blue-500/25 hover:to-blue-600/25 border border-blue-500/30 hover:border-blue-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-[10px]">CMC</span>
                </div>
                <h4 className="text-blue-300 font-bold text-sm">CMC Dex</h4>
              </div>
            </SafeLink>

            <SafeLink
              href='https://geckoterminal.com/'
              className="p-3 bg-gradient-to-br from-emerald-500/15 to-emerald-600/15 hover:from-emerald-500/25 hover:to-emerald-600/25 border border-emerald-500/30 hover:border-emerald-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">GT</span>
                </div>
                <h4 className="text-emerald-300 font-bold text-sm">GeckoTerminal</h4>
              </div>
            </SafeLink>

            <SafeLink
              href='https://dexscreener.com/'
              className="p-3 bg-gradient-to-br from-purple-500/15 to-purple-600/15 hover:from-purple-500/25 hover:to-purple-600/25 border border-purple-500/30 hover:border-purple-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">DS</span>
                </div>
                <h4 className="text-purple-300 font-bold text-sm">DexScreener</h4>
              </div>
            </SafeLink>
          </div>

          {/* DexCheck, Velvet Capital, Binance Alpha, Binance Web3 - Four Across */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <SafeLink
              href='https://dexcheck.ai/app'
              className="p-3 bg-gradient-to-br from-yellow-500/15 to-yellow-600/15 hover:from-yellow-500/25 hover:to-yellow-600/25 border border-yellow-500/30 hover:border-yellow-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-yellow-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">D</span>
                </div>
                <h4 className="text-yellow-300 font-bold text-sm">DexCheck</h4>
              </div>
            </SafeLink>

            <SafeLink
              href='https://dapp.velvet.capital/'
              className="p-3 bg-gradient-to-br from-pink-500/15 to-pink-600/15 hover:from-pink-500/25 hover:to-pink-600/25 border border-pink-500/30 hover:border-pink-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-pink-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <h4 className="text-pink-300 font-bold text-sm">Velvet Capital</h4>
              </div>
            </SafeLink>

            <SafeLink
              href='https://www.binance.com/en/markets/alpha-all'
              className="p-3 bg-gradient-to-br from-yellow-500/15 to-yellow-600/15 hover:from-yellow-500/25 hover:to-yellow-600/25 border border-yellow-500/30 hover:border-yellow-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-yellow-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">B</span>
                </div>
                <h4 className="text-yellow-300 font-bold text-sm">Binance Alpha</h4>
              </div>
            </SafeLink>

            <SafeLink
              href='https://web3.binance.com/en/markets/alpha?chain=bsc'
              className="p-3 bg-gradient-to-br from-orange-500/15 to-orange-600/15 hover:from-orange-500/25 hover:to-orange-600/25 border border-orange-500/30 hover:border-orange-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-orange-500/20 transform"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-xs">W3</span>
                </div>
                <h4 className="text-orange-300 font-bold text-sm">Binance Web3 Alpha</h4>
              </div>
            </SafeLink>
          </div>

          {/* Banterbubbles */}
          <div className="mt-8">
            <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
              <iframe
                src="https://banterbubbles.com/?utm_source=cbanter&utm_medium=cbanter&utm_campaign=cbanter&source=cbanter"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                title="Banterbubbles Market Intelligence"
                frameBorder="0"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
              />
            </div>
          </div>

          {/* Alphanomics Bubble Scanner */}
          <div className="mt-8">
            <div className="flex justify-end mb-4">
              <SafeLink
                href="https://platform.alphanomics.io/bubblescanner"
                className="text-purple-300 hover:text-purple-200 text-sm font-medium hover:underline transition-colors duration-300"
              >
                Open Full Platform →
              </SafeLink>
            </div>
            
            <SafeIframe
              src="https://platform.alphanomics.io/bubblescanner"
              title="Alphanomics Bubble Scanner"
              className="h-[700px]"
            />
          </div>

          {/* BBTerminal Trading Terminal */}
          <div className="mt-8">
            <div className="mb-3 flex justify-end">
              <SafeLink
                href="https://app.bbterminal.com/degen"
                className="text-purple-300 hover:text-purple-200 text-sm font-medium hover:underline transition-colors duration-300"
              >
                Open Full Terminal →
              </SafeLink>
            </div>
            <div className="w-full bg-black/20 border border-crypto-silver/20 rounded-lg p-4 shadow-lg">
              <SafeIframe
                src="https://app.bbterminal.com/degen"
                title="BBTerminal Degen Trading Terminal"
                className="w-full h-[600px] rounded-lg"
              />
            </div>
          </div>

          {/* AI Agents Section */}
          <div className="mt-8">
            <div className="flex items-center justify-center mb-4">
              <h4 className="text-xl font-bold bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent">AI Agents</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SafeLink
                href='https://agents.cookie.fun/'
                className="p-3 bg-gradient-to-br from-green-500/15 to-green-600/15 hover:from-green-500/25 hover:to-green-600/25 border border-green-500/30 hover:border-green-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/20 transform"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white font-bold text-xs">C</span>
                  </div>
                  <h4 className="text-green-300 font-bold text-sm">Cookie Agents</h4>
                </div>
              </SafeLink>

              <SafeLink
                href='https://ayaoracle.xyz/#agents_data'
                className="p-3 bg-gradient-to-br from-indigo-500/15 to-indigo-600/15 hover:from-indigo-500/25 hover:to-indigo-600/25 border border-indigo-500/30 hover:border-indigo-400/50 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-indigo-500/20 transform"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white font-bold text-xs">A</span>
                  </div>
                  <h4 className="text-indigo-300 font-bold text-sm">Aya AI</h4>
                </div>
              </SafeLink>
            </div>
          </div>
        </GlassCard>
      </div>

    </div>
  );
}