import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, BarChart3 } from "lucide-react";
import { openSecureLink } from "@/utils/security";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function DeFAIContent() {
  return (
    <div className="space-y-8">
      {/* DeFAI Glass Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Brain className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">DeFAI</h3>
            <p className="text-crypto-silver">AI-Powered DeFi Analytics & Protocols</p>
          </div>
        </div>

        {/* Trading & Analysis Subsection */}
        <div className="space-y-4 mb-8">
          <h4 className="text-lg font-medium text-cyan-400 mb-3">Trading & Analysis</h4>
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
            
            {/* Ethy.ai */}
            <a
              href="https://chat.ethyai.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black/20 border border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-4 h-auto rounded-md transition-colors flex items-center"
            >
              <Brain className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Ethy.ai</div>
                <div className="text-sm text-crypto-silver">AI-powered crypto chat assistant</div>
              </div>
            </a>
            
            {/* Bankr */}
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://bankr.bot/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-4 h-auto"
            >
              <Brain className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Bankr</div>
                <div className="text-sm text-crypto-silver">AI crypto analysis bot</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Yield Optimization & AI Hedge Funds Subsection */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-green-400 mb-3">Yield Optimization & AI Hedge Funds</h4>
          <div className="grid grid-cols-1 gap-4">
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

            {/* Quant.fun */}
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://quant.fun/vaults')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Quant.fun</div>
                <div className="text-sm text-crypto-silver">AI-powered quantitative trading vaults</div>
              </div>
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
