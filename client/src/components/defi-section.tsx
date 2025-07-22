import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, BarChart3, Brain, ArrowLeftRight } from "lucide-react";

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

      {/* Swap Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white mb-4">Swap</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={() => openInNewTab('https://www.relay.link/bridge')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-4 h-auto"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            <div className="text-left">
              <div className="font-semibold">Relay Bridge</div>
              <div className="text-sm text-crypto-silver">Cross-chain asset bridging</div>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => openInNewTab('https://aerodrome.finance/swap?from=eth&to=0x940181a94a35a4569e4529a3cdfb74e38fd98631&chain0=8453&chain1=8453')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            <div className="text-left">
              <div className="font-semibold">Aerodrome Finance</div>
              <div className="text-sm text-crypto-silver">BASE network DEX trading</div>
            </div>
          </Button>
        </div>
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

      {/* DeFAI Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Brain className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">DeFAI</h2>
            <p className="text-crypto-silver">AI-Powered DeFi Analytics & Protocols</p>
          </div>
        </div>

        {/* DeFAI */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Brain className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">DeFAI</h3>
              <p className="text-crypto-silver">AI-Powered DeFi Analytics & Protocols</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Senpi AI */}
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://senpi.ai/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-cyan-500/20 hover:border-cyan-500/30 text-white justify-start p-4 h-auto"
            >
              <Brain className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Senpi AI</div>
                <div className="text-sm text-crypto-silver">AI trading bot on Base network</div>
              </div>
            </Button>
            
            {/* AIxVC */}
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://www.aixvc.io/axelrod')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-4 h-auto"
            >
              <Brain className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">AIxVC</div>
                <div className="text-sm text-crypto-silver">AI venture capital management</div>
              </div>
            </Button>
            
            {/* Arma */}
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.arma.xyz/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Arma</div>
                <div className="text-sm text-crypto-silver">Yield farming protocol</div>
              </div>
            </Button>
            
            {/* ZyFAI */}
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://www.zyf.ai/dashboard')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-4 h-auto"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">ZyFAI</div>
                <div className="text-sm text-crypto-silver">AI automated yield farming</div>
              </div>
            </Button>
            
            {/* Mamo */}
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://mamo.bot/onboarding')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-indigo-500/20 hover:border-indigo-500/30 text-white justify-start p-4 h-auto"
            >
              <Brain className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Mamo</div>
                <div className="text-sm text-crypto-silver">Personal finance companion</div>
              </div>
            </Button>
          </div>
        </GlassCard>
      </div>


    </div>
  );
}