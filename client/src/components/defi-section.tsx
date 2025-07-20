import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, BarChart3 } from "lucide-react";

// Glass card component for DeFi section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

const openInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export default function DeFiSection() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">DeFi Analytics & Platforms</h2>
        <p className="text-crypto-silver">Comprehensive DeFi protocol access and portfolio management tools</p>
      </div>

      {/* Peapods Finance */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Peapods Finance</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            DEFI PROTOCOL
          </Badge>
          <button
            onClick={() => openInNewTab('https://peapods.finance/')}
            className="text-green-400 hover:text-green-300 text-sm ml-auto"
          >
            Open Full View →
          </button>
        </div>
        <iframe
          src="https://peapods.finance/"
          className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
          title="Peapods Finance"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </GlassCard>

      {/* Arma Protocol */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Arma Protocol</h3>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            YIELD FARMING
          </Badge>
          <button
            onClick={() => openInNewTab('https://app.arma.xyz/')}
            className="text-blue-400 hover:text-blue-300 text-sm ml-auto"
          >
            Open Full View →
          </button>
        </div>
        <iframe
          src="https://app.arma.xyz/"
          className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
          title="Arma Protocol"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </GlassCard>

      {/* ZYF AI Dashboard */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">ZYF AI Dashboard</h3>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            AI ANALYTICS
          </Badge>
          <button
            onClick={() => openInNewTab('https://www.zyf.ai/dashboard')}
            className="text-purple-400 hover:text-purple-300 text-sm ml-auto"
          >
            Open Full View →
          </button>
        </div>
        <iframe
          src="https://www.zyf.ai/dashboard"
          className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
          title="ZYF AI Dashboard"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </GlassCard>


    </div>
  );
}