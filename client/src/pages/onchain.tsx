import { Suspense } from "react";
import { UniversalNavigation } from "@/components/universal-navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, Activity, DollarSign } from "lucide-react";

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
        <div className="h-5 bg-crypto-warning/20 rounded w-16"></div>
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

export default function OnchainPage() {
  return (
    <div className="min-h-screen bg-crypto-dark text-white overflow-x-hidden">
      <UniversalNavigation activePage="onchain" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-8 h-8 text-crypto-warning" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-crypto-silver bg-clip-text text-transparent">
              Onchain Analytics
            </h1>
            <Badge variant="outline" className="bg-crypto-warning/20 text-crypto-warning border-crypto-warning/30">
              Live Data
            </Badge>
          </div>
          <p className="text-crypto-silver text-lg">
            Real-time onchain metrics, whale transactions, and network activity across all major blockchains
          </p>
        </div>

        <div className="space-y-8">
          {/* Whale Transactions */}
          <Suspense fallback={<SectionLoadingState title="Whale Transactions" />}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-6 h-6 text-crypto-warning" />
                  <h2 className="text-2xl font-bold text-white">Whale Transactions</h2>
                  <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                    Real-time
                  </Badge>
                </div>
                <Button
                  onClick={() => openSecureLink('https://etherscan.io/txs')}
                  variant="outline"
                  size="sm"
                  className="border-crypto-warning/30 text-crypto-warning hover:bg-crypto-warning/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Etherscan
                </Button>
              </div>
              
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <div className="relative w-full h-[600px]">
                  <iframe
                    src="https://app.bubblemaps.io/embed/eth/0xa0b86a33e6ba96200b8d75b7b0c618a7a7c4a8d0"
                    className="w-full h-full rounded-lg border border-crypto-silver/20"
                    title="Whale Transactions Bubble Map"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </GlassCard>
          </Suspense>

          {/* Onchain Metrics */}
          <Suspense fallback={<SectionLoadingState title="Onchain Metrics" />}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-6 h-6 text-crypto-warning" />
                  <h2 className="text-2xl font-bold text-white">Network Activity</h2>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    Analytics
                  </Badge>
                </div>
                <Button
                  onClick={() => openSecureLink('https://dune.com/browse/dashboards')}
                  variant="outline"
                  size="sm"
                  className="border-crypto-warning/30 text-crypto-warning hover:bg-crypto-warning/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Dune
                </Button>
              </div>
              
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <div className="relative w-full h-[600px]">
                  <iframe
                    src="https://dune.com/embeds/1551435/2622029/c0f4c4f8-6a5a-4b4a-a2a8-c8b2a5d4c1c1"
                    className="w-full h-full rounded-lg border border-crypto-silver/20"
                    title="Onchain Metrics Dashboard"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </GlassCard>
          </Suspense>

          {/* DeFiLlama Analytics */}
          <Suspense fallback={<SectionLoadingState title="DeFi Analytics" />}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Activity className="w-6 h-6 text-crypto-warning" />
                  <h2 className="text-2xl font-bold text-white">DeFi Total Value Locked</h2>
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    TVL
                  </Badge>
                </div>
                <Button
                  onClick={() => openSecureLink('https://defillama.com/')}
                  variant="outline"
                  size="sm"
                  className="border-crypto-warning/30 text-crypto-warning hover:bg-crypto-warning/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open DeFiLlama
                </Button>
              </div>
              
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <div className="relative w-full h-[600px]">
                  <iframe
                    src="https://defillama.com/chain/Ethereum?tvl=true&embed=true"
                    className="w-full h-full rounded-lg border border-crypto-silver/20"
                    title="DeFi TVL Analytics"
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