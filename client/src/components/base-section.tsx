import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Globe, ArrowLeftRight, TrendingUp, ExternalLink } from "lucide-react";


interface DashboardData {
  portfolioValue: number;
  portfolioPnL: number;
  portfolioPnLPercent: number;
  baseTopMovers: Array<{
    token: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
  }>;
  taoSubnetMovers: Array<{
    subnet: string;
    name: string;
    emissions: number;
    change24h: number;
    stakeWeight: number;
  }>;
  largeWalletActivity: Array<{
    type: 'BASE' | 'TAO';
    fromToken: string;
    toToken: string;
    amount: number;
    amountUsd: number;
    wallet: string;
    timestamp: string;
  }>;
  socialPulse: Array<{
    type: 'BASE' | 'TAO';
    token: string;
    name: string;
    mentions: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    trending: boolean;
  }>;
}

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20 ${className}`}>
    {children}
  </Card>
);

// Safe iframe component that doesn't throw errors
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

// Safe link component
const SafeLink = ({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      window.open(href, '_blank');
    } catch (error) {
      console.warn('Failed to open URL:', href, error);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};

export default function BaseSection() {
  const { data: dashboardData, isLoading: loadingDashboard, error } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 300000, // Refresh every 5 minutes
    retry: 3, // Retry failed requests
    staleTime: 60000 // Consider data stale after 1 minute
  });

  const isLoading = loadingDashboard;

  // Enhanced error handling and data validation
  if (error) {
    console.error('Dashboard data error:', error);
  }

  // Ensure we have valid data structure with fallbacks
  const safeData = dashboardData || {
    portfolioValue: 0,
    portfolioPnL: 0,
    portfolioPnLPercent: 0,
    baseTopMovers: [],
    taoSubnetMovers: [],
    largeWalletActivity: [],
    socialPulse: []
  };

  // Ensure arrays are properly initialized
  const baseTopMovers = Array.isArray(safeData.baseTopMovers) ? safeData.baseTopMovers : [];
  const taoSubnetMovers = Array.isArray(safeData.taoSubnetMovers) ? safeData.taoSubnetMovers : [];
  const largeWalletActivity = Array.isArray(safeData.largeWalletActivity) ? safeData.largeWalletActivity : [];
  const socialPulse = Array.isArray(safeData.socialPulse) ? safeData.socialPulse : [];

  if (isLoading && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Base Network</h2>
          <p className="text-crypto-silver">Loading BASE network overview...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <GlassCard key={i} className="p-6 animate-pulse">
              <div className="h-24 bg-white/10 rounded"></div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Base Network</h2>
          <p className="text-red-400">Error loading dashboard data. Showing platform integrations below.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Base Network Dashboard</h2>
        <p className="text-crypto-silver">Live BASE network analytics and DexScreener integration</p>
      </div>

      {/* DexScreener Base Network iframe */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">D</span>
            </div>
            <h3 className="text-xl font-semibold text-white">Trending</h3>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
              Live Data
            </span>
          </div>
          <SafeLink 
            href="https://dexscreener.com/base?theme=dark"
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </SafeLink>
        </div>
        <SafeIframe 
          src="https://dexscreener.com/base?theme=dark"
          title="DexScreener Base Network"
        />
      </GlassCard>

      {/* Farterminal */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">FT</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Farterminal</h3>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
            TERMINAL
          </span>
          <SafeLink 
            href="https://www.terminal.co/?tab=base"
            className="ml-auto text-green-400 hover:text-green-300 text-xs"
          >
            Open in New Tab →
          </SafeLink>
        </div>
        <SafeIframe 
          src="https://www.terminal.co/?tab=base"
          title="Farterminal"
        />
      </GlassCard>

      {/* BlockCreeper Explorer */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">BC</span>
          </div>
          <h3 className="text-xl font-semibold text-white">BlockCreeper Explorer</h3>
          <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full font-medium">
            BLOCKCHAIN EXPLORER
          </span>
          <SafeLink 
            href="https://www.blockcreeper.com/"
            className="ml-auto text-orange-400 hover:text-orange-300 text-xs"
          >
            Open in New Tab →
          </SafeLink>
        </div>
        <SafeIframe 
          src="https://www.blockcreeper.com/"
          title="BlockCreeper Explorer"
        />
      </GlassCard>

      {/* Checkr.social */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">CS</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Checkr.social</h3>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
            SOCIAL ANALYTICS
          </span>
          <SafeLink 
            href="https://checkr.social/"
            className="ml-auto text-blue-400 hover:text-blue-300 text-xs"
          >
            Open in New Tab →
          </SafeLink>
        </div>
        <SafeIframe 
          src="https://checkr.social/"
          title="Checkr.social"
        />
      </GlassCard>

      {/* X Signal Section */}
      <div className="space-y-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">X Signal</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              BASE SIGNAL
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <SafeLink
              href="https://x.com/BaseDailyTK"
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group block"
            >
              <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Base Daily TK</div>
              <div className="text-xs text-crypto-silver">@BaseDailyTK - Daily BASE network updates and insights</div>
            </SafeLink>
            
            <SafeLink
              href="https://x.com/MemesOnBase"
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group block"
            >
              <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Memes On Base</div>
              <div className="text-xs text-crypto-silver">@MemesOnBase - BASE network meme culture and community</div>
            </SafeLink>
            
            <SafeLink
              href="https://x.com/MemesOnBase_"
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group block"
            >
              <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Memes On Base</div>
              <div className="text-xs text-crypto-silver">@MemesOnBase_ - BASE network meme culture and trends</div>
            </SafeLink>
            
            <SafeLink
              href="https://x.com/Shake51_"
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group block"
            >
              <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Shake51</div>
              <div className="text-xs text-crypto-silver">@Shake51_ - BASE network trading insights</div>
            </SafeLink>
          </div>
        </GlassCard>
      </div>

      {/* Ecosystems Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <Globe className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Ecosystems</h2>
            <p className="text-crypto-silver">AI Agent Platforms & Trading Tools</p>
          </div>
        </div>

        {/* AI Agent Platforms */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <h3 className="text-xl font-semibold text-white">AI Agent Platforms</h3>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
              TRADING TOOLS
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SafeLink
              href="https://app.virtuals.io/"
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-purple-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">Virtuals.io</h4>
                  <p className="text-gray-400 text-xs">AI agent platform</p>
                </div>
              </div>
              <div className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors">→</div>
            </SafeLink>

            <SafeLink
              href="https://bankr.bot/terminal"
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-purple-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">Bankr.bot</h4>
                  <p className="text-gray-400 text-xs">Trading terminal</p>
                </div>
              </div>
              <div className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors">→</div>
            </SafeLink>

            <SafeLink
              href="https://creator.bid/agents"
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-emerald-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">Creator.bid</h4>
                  <p className="text-gray-400 text-xs">Agent marketplace</p>
                </div>
              </div>
              <div className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors">→</div>
            </SafeLink>

            <SafeLink
              href="https://www.clanker.world/"
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-blue-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CL</span>
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">Clanker</h4>
                  <p className="text-gray-400 text-xs">Token creation platform</p>
                </div>
              </div>
              <div className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors">→</div>
            </SafeLink>

            <SafeLink
              href="https://www.zoracle.xyz/"
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-purple-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Z</span>
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">Zoracle</h4>
                  <p className="text-gray-400 text-xs">Oracle platform</p>
                </div>
              </div>
              <div className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors">→</div>
            </SafeLink>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}