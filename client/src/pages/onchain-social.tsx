import { UniversalNavigation } from "@/components/universal-navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, TrendingUp, Hash, ExternalLink, Bot, Zap, Heart, Star } from "lucide-react";
import { openSecureLink } from '@/utils/security';
import onchainImage from "@assets/images_1756750962640.jpeg";

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
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <UniversalNavigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img 
                src={onchainImage} 
                alt="Social" 
                className="w-12 h-12 rounded-xl object-cover"
              />
              <h1 className="text-3xl font-bold text-white">Social</h1>
            </div>
            <p className="text-crypto-silver">Social trading, sentiment analysis, and community insights</p>
          </div>

          {/* Social Trading Platforms */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Social Trading</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SafeLink
                href='https://www.bitget.com/copytrading'
                className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-green-300 mb-2">Bitget Copy Trading</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Follow top traders automatically</p>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs mt-2">
                  COPY TRADING
                </Badge>
              </SafeLink>

              <SafeLink
                href='https://www.bybit.com/copytrading'
                className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-blue-300 mb-2">Bybit Copy Trading</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Social trading with leaderboards</p>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs mt-2">
                  LEADERBOARDS
                </Badge>
              </SafeLink>

              <SafeLink
                href='https://aptos.mirror.xyz/'
                className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-purple-300 mb-2">Mirror</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Decentralized content publishing</p>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs mt-2">
                  PUBLISHING
                </Badge>
              </SafeLink>
            </div>
          </GlassCard>

          {/* Sentiment Analysis */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Sentiment Analysis</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SafeLink
                href='https://alternative.me/crypto/fear-and-greed-index/'
                className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">Fear & Greed Index</div>
                <div className="text-xs text-crypto-silver">Market emotion gauge</div>
              </SafeLink>

              <SafeLink
                href='https://santiment.net/'
                className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Santiment</div>
                <div className="text-xs text-crypto-silver">On-chain social sentiment</div>
              </SafeLink>

              <SafeLink
                href='https://lunarcrush.com/'
                className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">LunarCrush</div>
                <div className="text-xs text-crypto-silver">Social intelligence platform</div>
              </SafeLink>

              <SafeLink
                href='https://www.thetics.com/'
                className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">Thetics</div>
                <div className="text-xs text-crypto-silver">Social sentiment analytics</div>
              </SafeLink>
            </div>
          </GlassCard>

          {/* Community Platforms */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Community Platforms</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SafeLink
                href='https://www.reddit.com/r/CryptoCurrency/'
                className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-orange-300 mb-2">r/CryptoCurrency</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Largest crypto community on Reddit</p>
              </SafeLink>

              <SafeLink
                href='https://discord.gg/ethereum'
                className="p-6 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 hover:from-indigo-500/20 hover:to-indigo-600/20 border border-indigo-500/20 hover:border-indigo-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-indigo-300 mb-2">Discord Communities</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Real-time crypto discussions</p>
              </SafeLink>

              <SafeLink
                href='https://stocktwits.com/streams/crypto'
                className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Hash className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-blue-300 mb-2">StockTwits</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Social network for traders</p>
              </SafeLink>
            </div>
          </GlassCard>

          {/* Social Trading Bots */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Trading Bots & Signals</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SafeLink
                href='https://3commas.io/'
                className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 hover:from-cyan-500/20 hover:to-cyan-600/20 border border-cyan-500/20 hover:border-cyan-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-cyan-300 mb-1">3Commas</div>
                <div className="text-xs text-crypto-silver">Automated trading bots</div>
              </SafeLink>

              <SafeLink
                href='https://cryptohopper.com/'
                className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">Cryptohopper</div>
                <div className="text-xs text-crypto-silver">Cloud-based trading bot</div>
              </SafeLink>

              <SafeLink
                href='https://www.tradingview.com/scripts/'
                className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">TradingView Signals</div>
                <div className="text-xs text-crypto-silver">Community trading scripts</div>
              </SafeLink>

              <SafeLink
                href='https://coinrule.com/'
                className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Coinrule</div>
                <div className="text-xs text-crypto-silver">Smart trading automation</div>
              </SafeLink>
            </div>
          </GlassCard>

          {/* Influencer Tracking */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Influencer Tracking</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SafeLink
                href='https://twitter.com/search?q=%23crypto'
                className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Twitter/X Crypto</div>
                <div className="text-xs text-crypto-silver">Real-time crypto discussions</div>
              </SafeLink>

              <SafeLink
                href='https://whalestats.com/'
                className="p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 hover:from-indigo-500/20 hover:to-indigo-600/20 border border-indigo-500/20 hover:border-indigo-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-indigo-300 mb-1">WhaleStats</div>
                <div className="text-xs text-crypto-silver">Whale wallet tracking</div>
              </SafeLink>

              <SafeLink
                href='https://www.coinglass.com/pro/i/Influencer'
                className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">CoinGlass Influencer</div>
                <div className="text-xs text-crypto-silver">Influencer sentiment tracking</div>
              </SafeLink>

              <SafeLink
                href='https://cryptopanic.com/'
                className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">CryptoPanic</div>
                <div className="text-xs text-crypto-silver">News aggregation platform</div>
              </SafeLink>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}