import { Suspense } from "react";
import { UniversalNavigation } from "@/components/universal-navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ChartLine, Coins, TrendingUp } from "lucide-react";

// Glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

// Loading skeleton component
const SectionLoadingState = ({ title }: { title: string }) => (
  <GlassCard className="p-6">
    <div className="animate-pulse">
      <div className="flex items-center space-x-2 mb-4">
        <div className="h-6 bg-crypto-silver/20 rounded w-32"></div>
        <div className="h-5 bg-blue-500/20 rounded w-16"></div>
      </div>
      <div className="h-96 bg-crypto-silver/10 rounded-xl"></div>
    </div>
  </GlassCard>
);

// Helper function for secure external links
const openSecureLink = (url: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
};

export default function BasePage() {
  return (
    <div className="min-h-screen bg-crypto-dark text-white overflow-x-hidden">
      <UniversalNavigation activePage="base" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <ChartLine className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Base Network
            </h1>
            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              Layer 2
            </Badge>
          </div>
          <p className="text-crypto-silver text-lg">
            Real-time analytics for Coinbase's Base Network - the secure, low-cost, builder-friendly Ethereum L2
          </p>
        </div>

        <div className="space-y-8">
          {/* Base Network Overview */}
          <Suspense fallback={<SectionLoadingState title="Base Network Overview" />}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Coins className="w-6 h-6 text-blue-400" />
                  <h2 className="text-2xl font-bold text-white">Network Statistics</h2>
                  <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                    Live
                  </Badge>
                </div>
                <Button
                  onClick={() => openSecureLink('https://basescan.org/')}
                  variant="outline"
                  size="sm"
                  className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on BaseScan
                </Button>
              </div>
              
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <div className="relative w-full h-[600px]">
                  <iframe
                    src="https://dune.com/embeds/3010449/5007826/61ddae83-f4df-4b7e-85e7-bd7e893ed5f3"
                    className="w-full h-full rounded-lg border border-crypto-silver/20"
                    title="Base Network Analytics"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </GlassCard>
          </Suspense>

          {/* Base DeFi Ecosystem */}
          <Suspense fallback={<SectionLoadingState title="Base DeFi" />}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                  <h2 className="text-2xl font-bold text-white">DeFi on Base</h2>
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    DeFi
                  </Badge>
                </div>
                <Button
                  onClick={() => openSecureLink('https://defillama.com/chain/Base')}
                  variant="outline"
                  size="sm"
                  className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on DeFiLlama
                </Button>
              </div>
              
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <div className="relative w-full h-[600px]">
                  <iframe
                    src="https://defillama.com/chain/Base?tvl=true&embed=true"
                    className="w-full h-full rounded-lg border border-crypto-silver/20"
                    title="Base DeFi TVL Analytics"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </GlassCard>
          </Suspense>

          {/* Base Token Charts */}
          <Suspense fallback={<SectionLoadingState title="Base Tokens" />}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <ChartLine className="w-6 h-6 text-blue-400" />
                  <h2 className="text-2xl font-bold text-white">Top Base Tokens</h2>
                  <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                    Trading
                  </Badge>
                </div>
                <Button
                  onClick={() => openSecureLink('https://dexscreener.com/base')}
                  variant="outline"
                  size="sm"
                  className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on DexScreener
                </Button>
              </div>
              
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <div className="relative w-full h-[600px]">
                  <iframe
                    src="https://dexscreener.com/base?embed=1&theme=dark&trades=0&info=0"
                    className="w-full h-full rounded-lg border border-crypto-silver/20"
                    title="Base Network Token Charts"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </GlassCard>
          </Suspense>

          {/* Aerodrome Finance - Base's Leading DEX */}
          <Suspense fallback={<SectionLoadingState title="Aerodrome Finance" />}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Coins className="w-6 h-6 text-blue-400" />
                  <h2 className="text-2xl font-bold text-white">Aerodrome Finance</h2>
                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                    DEX
                  </Badge>
                </div>
                <Button
                  onClick={() => openSecureLink('https://aerodrome.finance/')}
                  variant="outline"
                  size="sm"
                  className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Aerodrome
                </Button>
              </div>
              
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <div className="relative w-full h-[600px]">
                  <iframe
                    src="https://www.geckoterminal.com/base/aerodrome/pools?embed=1&info=0&swaps=0"
                    className="w-full h-full rounded-lg border border-crypto-silver/20"
                    title="Aerodrome Finance Pools"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </GlassCard>
          </Suspense>
        </div>
      </div>
    </div>
  );
}