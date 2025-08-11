import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe, Zap, Layers, Network } from "lucide-react";
import hippoImage from "@assets/image_1753204691716.png";
import { openSecureLink } from "@/utils/security";
import { UniversalNavigation } from "@/components/universal-navigation";
import { useScrollFade } from "@/hooks/useScrollFade";

// Glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl ${className}`}>
    {children}
  </div>
);

export default function OtherEcosystemsPage() {
  const headerOpacity = useScrollFade(30, 120);

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300" style={{ opacity: headerOpacity }}>
        <div className="max-w-[95vw] mx-auto px-2 sm:px-3">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden">
                <img 
                  src={hippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                CryptoHippo
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="other-ecosystems" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-6 lg:space-y-8">
          {/* Page Header */}
          <div className="text-center px-3 sm:px-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Other Ecosystems</h2>
            <p className="text-sm sm:text-base text-crypto-silver">Emerging blockchain networks and alternative crypto ecosystems</p>
          </div>

          {/* Ecosystems Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Avalanche */}
            <GlassCard className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <Network className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Avalanche</h3>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    AVAX
                  </Badge>
                </div>
                <button
                  onClick={() => openSecureLink('https://core.app/')}
                  className="text-red-400 hover:text-red-300 text-sm sm:ml-auto flex items-center gap-1"
                >
                  Core App <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <iframe
                src="https://core.app/"
                className="w-full h-[500px] rounded-lg border border-crypto-silver/20"
                title="Avalanche Core"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </GlassCard>

            {/* Polygon */}
            <GlassCard className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Polygon</h3>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    MATIC
                  </Badge>
                </div>
                <button
                  onClick={() => openSecureLink('https://polygon.technology/')}
                  className="text-purple-400 hover:text-purple-300 text-sm sm:ml-auto flex items-center gap-1"
                >
                  Official Site <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <iframe
                src="https://polygon.technology/"
                className="w-full h-[500px] rounded-lg border border-crypto-silver/20"
                title="Polygon"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </GlassCard>

            {/* Arbitrum */}
            <GlassCard className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Arbitrum</h3>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    ARB
                  </Badge>
                </div>
                <button
                  onClick={() => openSecureLink('https://arbitrum.io/')}
                  className="text-blue-400 hover:text-blue-300 text-sm sm:ml-auto flex items-center gap-1"
                >
                  Official Site <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <iframe
                src="https://arbitrum.io/"
                className="w-full h-[500px] rounded-lg border border-crypto-silver/20"
                title="Arbitrum"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </GlassCard>

            {/* Optimism */}
            <GlassCard className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Optimism</h3>
                  <Badge className="bg-red-600/20 text-red-300 border-red-600/30">
                    OP
                  </Badge>
                </div>
                <button
                  onClick={() => openSecureLink('https://www.optimism.io/')}
                  className="text-red-300 hover:text-red-200 text-sm sm:ml-auto flex items-center gap-1"
                >
                  Official Site <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <iframe
                src="https://www.optimism.io/"
                className="w-full h-[500px] rounded-lg border border-crypto-silver/20"
                title="Optimism"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </GlassCard>

            {/* Cardano */}
            <GlassCard className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Network className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Cardano</h3>
                  <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30">
                    ADA
                  </Badge>
                </div>
                <button
                  onClick={() => openSecureLink('https://cardano.org/')}
                  className="text-blue-300 hover:text-blue-200 text-sm sm:ml-auto flex items-center gap-1"
                >
                  Official Site <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <iframe
                src="https://cardano.org/"
                className="w-full h-[500px] rounded-lg border border-crypto-silver/20"
                title="Cardano"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </GlassCard>

            {/* Sui */}
            <GlassCard className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Sui</h3>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    SUI
                  </Badge>
                </div>
                <button
                  onClick={() => openSecureLink('https://sui.io/')}
                  className="text-cyan-400 hover:text-cyan-300 text-sm sm:ml-auto flex items-center gap-1"
                >
                  Official Site <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <iframe
                src="https://sui.io/"
                className="w-full h-[500px] rounded-lg border border-crypto-silver/20"
                title="Sui Network"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </GlassCard>

          </div>
        </div>
      </main>
    </div>
  );
}