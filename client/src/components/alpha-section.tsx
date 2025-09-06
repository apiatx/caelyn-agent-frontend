import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BarChart3, ExternalLink, TrendingUp, Link2, Star, Wallet, TrendingDown, Globe, Layers, Activity } from 'lucide-react';
import { openSecureLink } from '@/utils/security';
import onchainImage from "@assets/images_1756750962640.jpeg";

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

      {/* Macro Analytics */}
      <div className="space-y-8">
        {/* Macro Analytics */}
        <GlassCard className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Macro Analytics</h3>
            </div>
          </div>

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

          {/* Inspect Tools */}
          <div>
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
          </div>
        </GlassCard>
      </div>

      {/* Micro Analytics */}
      <div className="space-y-8 mt-12">
        <GlassCard className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Micro Analytics</h3>
            </div>
          </div>

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
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🍪</span>
                </div>
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


      {/* Smart Wallets */}
      <div className="space-y-8 mt-12">
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
            <SafeIframe
              src="https://app.chainlyze.ai/smart-wallet"
              title="Chainlyze Smart Wallet Tracker"
              className="h-[600px]"
            />
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

      {/* Token Sniffer */}
      <div className="space-y-8 mt-12">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Token Sniffer</h3>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                AI CHAT
              </Badge>
            </div>
            <button
              onClick={() => openInNewTab('https://wach.ai/chat')}
              className="text-yellow-400 hover:text-yellow-300 text-sm"
            >
              Open in New Tab →
            </button>
          </div>
          <div className="mb-6">
            <SafeIframe
              src="https://wach.ai/chat"
              title="WachAI Chat Interface"
              className="h-[500px]"
            />
          </div>

          {/* Bubblemaps */}
          <div className="mb-6">
            <SafeLink
              href='https://bubblemaps.io/'
              className="w-full p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors block"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-purple-400 font-semibold">Bubblemaps</h4>
              </div>
              <p className="text-gray-400 text-sm">Token Analytics & Visualization</p>
            </SafeLink>
          </div>
        </GlassCard>
      </div>

      {/* Social Intelligence */}
      <div className="space-y-8 mt-12">
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
                <p className="text-gray-400 text-sm">AI Analytics Platform</p>
              </SafeLink>
            </div>
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

    </div>
  );
}