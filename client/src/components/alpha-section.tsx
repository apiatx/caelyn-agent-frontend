import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BarChart3, ExternalLink, TrendingUp, Link2, Star, Wallet, TrendingDown } from 'lucide-react';

interface SafeLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const SafeLink: React.FC<SafeLinkProps> = ({ href, children, className = "" }) => {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button onClick={() => openInNewTab(href)} className={className}>
      {children}
    </button>
  );
};

export default function AlphaSection() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
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
        <Card className="p-3 sm:p-4 lg:p-6 bg-black/40 backdrop-blur-md border-white/10">
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
            <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 overflow-hidden">
              <iframe
                src="https://app.artemisanalytics.com/"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px]"
                title="Artemis Analytics Dashboard"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                referrerPolicy="no-referrer-when-downgrade"
                loading="lazy"
                allow="fullscreen; web-share; clipboard-read; clipboard-write; camera; microphone"
                style={{ border: 'none' }}
              />
            </div>
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
            <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 overflow-hidden mb-6">
              <iframe
                src="https://app.nansen.ai/"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px]"
                title="Nansen Analytics Dashboard"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                referrerPolicy="no-referrer-when-downgrade"
                loading="lazy"
                style={{ border: 'none' }}
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
            <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 overflow-hidden mb-6">
              <iframe
                src="https://messari.io/"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px]"
                title="Messari Research Platform"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                referrerPolicy="no-referrer-when-downgrade"
                loading="lazy"
                style={{ border: 'none' }}
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
          </div>
        </Card>

        {/* DexCheck - Signal Section */}
        <Card className="p-6 bg-black/40 backdrop-blur-md border-white/10">
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
            <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
              <iframe
                src="https://dexcheck.ai/app"
                title="DexCheck.ai Analytics Dashboard"
                className="w-full h-[600px] border-0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
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
            
            <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
              <iframe
                src="https://platform.alphanomics.io/"
                title="Alphanomics Analytics Platform"
                className="w-full h-[600px] border-0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </Card>

        {/* Smart Wallets */}
        <Card className="p-6 bg-black/40 backdrop-blur-md border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Smart Wallets</h3>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              COMING SOON
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
        </Card>
      </div>
    </div>
  );
}