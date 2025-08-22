import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, BarChart3, Brain, ArrowLeftRight, Wallet, ExternalLink, Layers, Shield } from "lucide-react";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";

// Safe components for external links and iframes
const SafeLink = ({ href, children, className = "", ...props }: { 
  href: string; 
  children: React.ReactNode; 
  className?: string; 
  [key: string]: any; 
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={className}
    onClick={(e) => {
      e.preventDefault();
      openSecureLink(href);
    }}
    {...props}
  >
    {children}
  </a>
);

const SafeIframe = ({ src, title, className = "", ...props }: { 
  src: string; 
  title: string; 
  className?: string; 
  [key: string]: any; 
}) => (
  <iframe
    src={src}
    title={title}
    className={className}
    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    {...props}
  />
);

// Glass card component for DeFi section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

// Use secure link opening
const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function DeFiSection() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">DeFi Hub</h2>
        <p className="text-crypto-silver">Comprehensive Decentralized Finance access and analytics</p>
      </div>

      {/* DeFiLlama */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">🔥</span>
          </div>
          DeFiLlama
          <SafeLink
            href="https://defillama.com/"
            className="ml-auto text-xs text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </SafeLink>
        </h3>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
          <SafeIframe
            src="https://defillama.com/"
            title="DeFi TVL Rankings by DefiLlama"
            className="w-full h-[600px] border-0"
          />
        </div>
      </div>

      {/* DeFi.app Portfolio */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          DeFi.app Portfolio Tracker
        </h3>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-white mb-2">Portfolio Tracking</h4>
              <p className="text-gray-400 mb-4">Track your DeFi positions across all protocols and chains</p>
              <SafeLink
                href="https://app.defi.app/portfolio"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white font-semibold hover:from-blue-600 hover:to-purple-600 transition-colors"
              >
                <Wallet className="w-5 h-5" />
                Open DeFi.app Portfolio
                <ExternalLink className="w-4 h-4" />
              </SafeLink>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Chain Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white mb-4">Cross-Chain Swap</h3>
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
            onClick={() => openInNewTab('https://universalx.app/home')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-4 h-auto"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            <div className="text-left">
              <div className="font-semibold">UniversalX</div>
              <div className="text-sm text-crypto-silver">Trade any token, on any chain</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.definitive.fi/0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463/hyperevm')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-4 h-auto"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            <div className="text-left">
              <div className="font-semibold">Definitive Edge</div>
              <div className="text-sm text-crypto-silver">Trade any token, on any chain</div>
            </div>
          </Button>
        </div>
      </div>

      {/* DeFi Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
            <DollarSign className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">DeFi</h2>
            <p className="text-crypto-silver">Core DeFi protocols and platforms</p>
          </div>
        </div>
        
        {/* Peapods Finance Iframe */}
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

        {/* DeFi Platform Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Button
            variant="outline"
            onClick={() => openInNewTab('https://defi.instadapp.io/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20">
              <Wallet className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Fluid</div>
              <div className="text-sm text-crypto-silver">DeFi protocol platform</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.aave.com/?ampDeviceId=c6075ac5-445d-4e03-b727-5c01b59e4b95')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <DollarSign className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Aave</div>
              <div className="text-sm text-crypto-silver">Lending protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://lido.fi/lido-multichain')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
              <Layers className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Lido</div>
              <div className="text-sm text-crypto-silver">Liquid staking</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.eigenlayer.xyz/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20">
              <Shield className="h-6 w-6 text-orange-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Eigenlayer</div>
              <div className="text-sm text-crypto-silver">Restaking protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://aerodrome.finance/liquidity')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
              <ArrowLeftRight className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Aerodrome</div>
              <div className="text-sm text-crypto-silver">Base Network Liquidity Hub</div>
            </div>
          </Button>
        </div>
      </div>

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



      {/* Betting Markets */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Betting Markets</h3>
          <Badge className="bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30">
            PREDICTION MARKETS
          </Badge>
          <button
            onClick={() => openInNewTab('https://polymarket.com/crypto')}
            className="text-orange-400 hover:text-orange-300 text-sm ml-auto"
          >
            Open Full View →
          </button>
        </div>
        <iframe
          src="https://polymarket.com/crypto"
          className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
          title="Polymarket Crypto"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </GlassCard>

      {/* CEX Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Wallet className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">On Ramp</h2>
            <p className="text-crypto-silver">Fiat to crypto onboarding platforms</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="outline"
            onClick={() => openInNewTab('https://www.coinbase.com/home')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20">
              <Wallet className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Coinbase</div>
              <div className="text-sm text-crypto-silver">Leading crypto exchange</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://www.kraken.com/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-purple-600/20">
              <Wallet className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Kraken</div>
              <div className="text-sm text-crypto-silver">Professional trading platform</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://www.moonpay.com/buy?af_xp=qr&isMoonkit=true&source_caller=ui&pid=moonpay.com&af_js_web=true&shortlink=41j0y9vo&af_adset=moonpay.com&af_ad=moonpay.com&deep_link_value=buy&af_ss_ui=true&c=moonpay.com&af_ss_ver=2_7_3')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-green-600/20">
              <Wallet className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">MoonPay</div>
              <div className="text-sm text-crypto-silver">Crypto payment gateway</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://strike.me/en/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-yellow-500/20">
              <Wallet className="h-6 w-6 text-orange-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Strike</div>
              <div className="text-sm text-crypto-silver">Bitcoin payment app</div>
            </div>
          </Button>
        </div>
      </div>

    </div>
  );
}