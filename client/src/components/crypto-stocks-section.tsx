import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ExternalLink, Bitcoin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// Glass card component for crypto stocks
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function CryptoStocksSection() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Bitcoin Treasuries */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <Bitcoin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Bitcoin Treasuries</h3>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
              CORPORATE
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://bitcointreasuries.net/')}
            className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open Full View →
          </button>
        </div>

        <div className="w-full">
          <iframe
            src="https://bitcointreasuries.net/"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="Bitcoin Treasuries"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* ETH Treasuries */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">Ξ</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">ETH Treasuries</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              ETHEREUM
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.strategicethreserve.xyz/')}
            className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open Full View →
          </button>
        </div>

        <div className="w-full">
          <iframe
            src="https://www.strategicethreserve.xyz/"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="ETH Treasuries"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TAO Treasuries */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">τ</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">TAO Treasuries</h3>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              BITTENSOR
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://taotreasuries.app/')}
            className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open Full View →
          </button>
        </div>

        <div className="w-full">
          <iframe
            src="https://taotreasuries.app/"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="TAO Treasuries"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* VanEck Digital Transformation ETF */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">VanEck Digital Transformation ETF</h3>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              ETF
            </Badge>
          </div>
        </div>

        <div className="w-full">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-lg p-8 border border-green-500/20 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-semibold text-white mb-2">VanEck Digital Transformation ETF (DAPP)</h4>
                <p className="text-crypto-silver text-sm mb-4">Access comprehensive digital transformation and blockchain investment analysis</p>
              </div>
              <Button
                onClick={() => openInNewTab('https://www.vaneck.com/us/en/investments/digital-transformation-etf-dapp/overview/')}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Access VanEck DAPP ETF
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}