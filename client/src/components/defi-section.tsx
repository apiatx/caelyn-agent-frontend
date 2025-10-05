import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, BarChart3, Brain, ArrowLeftRight, Wallet, ExternalLink, Layers, Shield, Database, Zap } from "lucide-react";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import cryptoHippoDefi from "@assets/CryptoHippo_1757212757402.png";

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
      {/* DeFi Hub - Enhanced Header */}
      <div className="text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 blur-3xl -z-10"></div>
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300 overflow-hidden">
            <img 
              src={cryptoHippoDefi} 
              alt="Crypto Hippo DeFi" 
              className="w-28 h-28 object-cover"
            />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-green-200 to-emerald-200 bg-clip-text text-transparent">DeFi Hub</h2>
        </div>
        <p className="text-lg text-white/80 font-medium tracking-wide">Comprehensive Decentralized Finance access and analytics</p>
        <div className="w-32 h-1 bg-gradient-to-r from-green-500 to-emerald-500 mx-auto mt-4 rounded-full"></div>
      </div>


      {/* Analytics Glass Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <BarChart3 className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Analytics</h3>
            <p className="text-crypto-silver">DeFi TVL rankings and protocol analytics</p>
          </div>
        </div>
        
        <div className="flex justify-end mb-3">
          <SafeLink
            href="https://defillama.com/"
            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </SafeLink>
        </div>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
          <SafeIframe
            src="https://defillama.com/"
            title="DeFi TVL Rankings by DefiLlama"
            className="w-full h-[600px] border-0"
          />
        </div>
      </GlassCard>

      {/* DeFi Protocols Glass Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <DollarSign className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">DeFi Protocols</h3>
            <p className="text-crypto-silver">Decentralized finance platforms and protocols</p>
          </div>
        </div>

        {/* Reservoir Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Reservoir</h4>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              STABLECOIN YIELD
            </Badge>
            <button
              onClick={() => openInNewTab('https://app.reservoir.xyz/')}
              className="text-blue-400 hover:text-blue-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <SafeIframe
            src="https://app.reservoir.xyz/"
            title="Reservoir NFT Protocol"
            className="w-full h-[600px] border-0"
          />
        </div>

        {/* Yield.fi Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Yield.fi</h4>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              VYUSD YIELD
            </Badge>
            <button
              onClick={() => openInNewTab('https://www.yield.fi/vyusd')}
              className="text-yellow-400 hover:text-yellow-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://www.yield.fi/vyusd"
              title="Yield.fi vyUSD Yield Protocol"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

        {/* River Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">River</h4>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              DEFI PLATFORM
            </Badge>
            <button
              onClick={() => openInNewTab('https://app.river.inc/')}
              className="text-cyan-400 hover:text-cyan-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://app.river.inc/"
              title="River DeFi Platform"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

        {/* Aarna AI Engine Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Aarna AI Engine</h4>
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
              AI PLATFORM
            </Badge>
            <button
              onClick={() => openInNewTab('https://engine.aarna.ai/?_branch_match_id=1349040087720564161&_branch_referrer=H4sIAAAAAAAAA8soKSkottLXTywo0EtMLMpL1EvM1HfLN7Lw98oxzAxPsq8rSk1LLSrKzEuPTyrKLy9OLbJ1zijKz00FAD%2FYufM6AAAA')}
              className="text-indigo-400 hover:text-indigo-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://engine.aarna.ai/?_branch_match_id=1349040087720564161&_branch_referrer=H4sIAAAAAAAAA8soKSkottLXTywo0EtMLMpL1EvM1HfLN7Lw98oxzAxPsq8rSk1LLSrKzEuPTyrKLy9OLbJ1zijKz00FAD%2FYufM6AAAA"
              title="Aarna AI Engine Platform"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

        {/* Spark Fi Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Spark Fi</h4>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              LENDING PROTOCOL
            </Badge>
            <button
              onClick={() => openInNewTab('https://app.spark.fi/')}
              className="text-orange-400 hover:text-orange-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://app.spark.fi/"
              title="Spark Fi Lending Protocol"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>


        {/* Balancer Pools Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Balancer Pools</h4>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              LIQUIDITY POOLS
            </Badge>
            <button
              onClick={() => openInNewTab('https://balancer.fi/pools')}
              className="text-purple-400 hover:text-purple-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://balancer.fi/pools"
              title="Balancer Liquidity Pools"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

        {/* Impermax Finance Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Impermax Finance</h4>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              LEVERAGED LENDING
            </Badge>
            <button
              onClick={() => openInNewTab('https://app.impermax.finance/')}
              className="text-blue-400 hover:text-blue-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://app.impermax.finance/"
              title="Impermax Finance"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

        {/* Synthetix 420 Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Synthetix 420</h4>
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
              SYNTHETIC ASSETS
            </Badge>
            <button
              onClick={() => openInNewTab('https://420.synthetix.io/')}
              className="text-indigo-400 hover:text-indigo-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://420.synthetix.io/"
              title="Synthetix 420"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

        {/* Sky Money Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Sky Money</h4>
            <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30">
              ETHEREUM DEFI
            </Badge>
            <button
              onClick={() => openInNewTab('https://app.sky.money/?network=ethereum')}
              className="text-sky-400 hover:text-sky-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://app.sky.money/?network=ethereum"
              title="Sky Money"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

        {/* Venus Protocol Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Venus Protocol</h4>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              BSC LENDING
            </Badge>
            <button
              onClick={() => openInNewTab('https://app.venus.io/#/pool/0xfD36E2c2a6789Db23113685031d7F16329158384?chainId=56&tab=assets')}
              className="text-yellow-400 hover:text-yellow-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://app.venus.io/#/pool/0xfD36E2c2a6789Db23113685031d7F16329158384?chainId=56&tab=assets"
              title="Venus Protocol"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

        {/* Convex Finance Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Convex Finance</h4>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              CURVE BOOSTER
            </Badge>
            <button
              onClick={() => openInNewTab('https://www.convexfinance.com/')}
              className="text-red-400 hover:text-red-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://www.convexfinance.com/"
              title="Convex Finance"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

        {/* Solstice Finance Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Solstice Finance</h4>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              DEFI PLATFORM
            </Badge>
            <button
              onClick={() => openInNewTab('https://app.solstice.finance/')}
              className="text-orange-400 hover:text-orange-300 text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <SafeIframe
              src="https://app.solstice.finance/"
              title="Solstice Finance"
              className="w-full h-[600px] border-0"
            />
          </div>
        </div>

{/* Peapods Finance Iframe */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Peapods Finance</h4>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              VOLATILITY FARMING
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
        </div>

        {/* DeFi Platform Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => openInNewTab('https://fluid.instadapp.io/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-fluid"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
              <Wallet className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Fluid</div>
              <div className="text-sm text-crypto-silver">DeFi Protocol Platform</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.plasma.to/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-plasma"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20">
              <Wallet className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Plasma.to</div>
              <div className="text-sm text-crypto-silver">DeFi Platform</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://kerneldao.com/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-kernel"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20">
              <Database className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Kernel DAO</div>
              <div className="text-sm text-crypto-silver">Web3 Builder Community</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://kinetiq.xyz/earn')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-kinetiq-earn"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-teal-500/20">
              <TrendingUp className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Kinetiq</div>
              <div className="text-sm text-crypto-silver">HYPE DeFi protocols</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://kamino.com/earn')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-kamino"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <DollarSign className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Kamino</div>
              <div className="text-sm text-crypto-silver">Earn Platform</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.gearbox.fi/dashboard')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-gearbox"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
              <Wallet className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Gearbox</div>
              <div className="text-sm text-crypto-silver">Leverage protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.pendle.finance/trade/markets')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-pendle"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Pendle</div>
              <div className="text-sm text-crypto-silver">Yield trading</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://boros.pendle.finance/markets')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-borosfi"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-teal-500/20">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">BorosFi</div>
              <div className="text-sm text-crypto-silver">Yield markets</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.maple.finance/earn?_gl=1*8470fi*_ga*MTA1NDM1NDE0OS4xNzU4OTg4ODUw*_ga_7GW90C7X77*czE3NTg5ODg4NDkkbzEkZzAkdDE3NTg5ODg4NDkkajYwJGwwJGgw')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-maple"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20">
              <DollarSign className="h-6 w-6 text-amber-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Maple</div>
              <div className="text-sm text-crypto-silver">Lending protocol</div>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.euler.finance/earn?network=ethereum')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-euler"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-violet-500/20">
              <DollarSign className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Euler</div>
              <div className="text-sm text-crypto-silver">Earn Protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.aave.com/?ampDeviceId=c6075ac5-445d-4e03-b727-5c01b59e4b95')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-aave"
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
            onClick={() => openInNewTab('https://app.resolv.xyz/overview')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-resolv"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-teal-500/20">
              <TrendingUp className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Resolv</div>
              <div className="text-sm text-crypto-silver">DeFi platform</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.initia.xyz/liquidity')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-initia"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-500/20 to-green-500/20">
              <Layers className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Initia</div>
              <div className="text-sm text-crypto-silver">Liquidity platform</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://lido.fi/lido-multichain')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-lido"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
              <Layers className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Lido</div>
              <div className="text-sm text-crypto-silver">Liquid staking</div>
            </div>
          </Button>

          <a
            href="https://app.eigenlayer.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/20 border border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-6 h-auto flex-col space-y-2 rounded-md transition-colors flex items-center"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20">
              <Shield className="h-6 w-6 text-orange-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Eigenlayer</div>
              <div className="text-sm text-crypto-silver">Restaking protocol</div>
            </div>
          </a>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://morpho.org/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-indigo-500/20">
              <DollarSign className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Morpho</div>
              <div className="text-sm text-crypto-silver">Lending protocol optimizer</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://www.ether.fi/app/cash/safe')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <Wallet className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Ether.fi</div>
              <div className="text-sm text-crypto-silver">Liquid restaking protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.ethena.fi/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-indigo-500/20 hover:border-indigo-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-ethena"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-500/20 to-violet-500/20">
              <DollarSign className="h-6 w-6 text-indigo-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Ethena</div>
              <div className="text-sm text-crypto-silver">Synthetic stablecoin</div>
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

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.teller.org/ethereum/borrow')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-cyan-500/20 hover:border-cyan-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20">
              <DollarSign className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Teller</div>
              <div className="text-sm text-crypto-silver">Decentralized lending protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.seamlessprotocol.com/#/?tab=Vaults')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-teal-500/20 hover:border-teal-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-teal-500/20 to-emerald-500/20">
              <Shield className="h-6 w-6 text-teal-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Seamless Protocol</div>
              <div className="text-sm text-crypto-silver">Yield farming vaults</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://www.tarot.to/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-pink-500/20 hover:border-pink-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500/20 to-rose-500/20">
              <DollarSign className="h-6 w-6 text-pink-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Tarot</div>
              <div className="text-sm text-crypto-silver">Lending and leverage protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://arcadia.finance/farm')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-yellow-500/20 hover:border-yellow-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20">
              <TrendingUp className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Arcadia Finance</div>
              <div className="text-sm text-crypto-silver">DeFi portfolio management</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.spectra.finance/pools')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20">
              <Layers className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Spectra</div>
              <div className="text-sm text-crypto-silver">Yield derivatives protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.lotusfinance.io/explore-pools')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-yellow-500/20">
              <DollarSign className="h-6 w-6 text-orange-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Lotus Finance</div>
              <div className="text-sm text-crypto-silver">LP and Farm on SUI</div>
            </div>
          </Button>


          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.tharwa.finance/staking')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-teal-500/20 hover:border-teal-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-teal-500/20 to-emerald-500/20">
              <DollarSign className="h-6 w-6 text-teal-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Tharwa</div>
              <div className="text-sm text-crypto-silver">DeFi staking platform</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.harvest.finance/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-yellow-500/20 hover:border-yellow-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20">
              <TrendingUp className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Harvest Finance</div>
              <div className="text-sm text-crypto-silver">Yield farming protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.mux.network/#/liquidity/mux-v3/overview?chainId=42161')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-mux"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20">
              <ArrowLeftRight className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Mux Network</div>
              <div className="text-sm text-crypto-silver">Liquidity protocol</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://web3.okx.com/earn')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-okx-earn"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-amber-500/20">
              <TrendingUp className="h-6 w-6 text-orange-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">OKX Earn</div>
              <div className="text-sm text-crypto-silver">Yield farming</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.gearbox.fi/dashboard')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-gearbox"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
              <DollarSign className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Gearbox</div>
              <div className="text-sm text-crypto-silver">Leverage protocol</div>
            </div>
          </Button>
        </div>

        {/* Huma Finance Button Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => openInNewTab('https://app.huma.finance/')}
            className="bg-black/20 border-crypto-silver/20 hover:bg-teal-500/20 hover:border-teal-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
            data-testid="button-huma"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-teal-500/20 to-emerald-500/20">
              <DollarSign className="h-6 w-6 text-teal-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">Huma Finance</div>
              <div className="text-sm text-crypto-silver">DeFi lending</div>
            </div>
          </Button>
        </div>
      </GlassCard>

    </div>
  );
}
