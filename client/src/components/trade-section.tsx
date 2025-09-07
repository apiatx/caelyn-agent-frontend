import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, TrendingUp, ExternalLink, Wallet, ArrowUpDown } from "lucide-react";
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

// Enhanced glass card component for Trade section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-gradient-to-br from-black/60 via-black/40 to-transparent backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 ${className}`}>
    {children}
  </Card>
);

// Use secure link opening
const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function TradeSection() {
  return (
    <div className="space-y-12 p-6">
      {/* TRADE Section - Enhanced Header */}
      <div className="text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 blur-3xl -z-10"></div>
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30 hover:scale-110 transition-transform duration-300">
            <ArrowLeftRight className="text-white w-8 h-8" />
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">TRADE</h2>
        </div>
        <p className="text-lg text-white/80 font-medium tracking-wide">Premium Cross-Chain Trading & Exchange Platforms</p>
        <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Cross-Chain Section */}
      <GlassCard className="p-8">
        <div className="space-y-10">
        
        {/* Swap Subsection */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
              <ArrowUpDown className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-300 bg-clip-text text-transparent">Swap</h4>
            <div className="flex-1 h-px bg-gradient-to-r from-pink-500/50 to-transparent"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.uniswap.org')}
              className="group bg-gradient-to-br from-pink-500/30 via-pink-600/20 to-rose-600/30 border-pink-400/40 hover:from-pink-400/40 hover:via-pink-500/30 hover:to-rose-500/40 hover:border-pink-300/60 text-white justify-start p-6 h-auto shadow-2xl hover:shadow-pink-500/30 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowUpDown className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-300" />
              <div className="text-left">
                <div className="font-bold text-lg">Uniswap</div>
                <div className="text-sm text-pink-100/90">Leading DEX on Ethereum</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://pancakeswap.finance/swap')}
              className="group bg-gradient-to-br from-yellow-500/30 via-amber-500/20 to-orange-500/30 border-yellow-400/40 hover:from-yellow-400/40 hover:via-amber-400/30 hover:to-orange-400/40 hover:border-yellow-300/60 text-white justify-start p-6 h-auto shadow-2xl hover:shadow-yellow-500/30 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowUpDown className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-300" />
              <div className="text-left">
                <div className="font-bold text-lg">PancakeSwap</div>
                <div className="text-sm text-yellow-100/90">Popular BSC DEX</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://jup.ag')}
              className="group bg-gradient-to-br from-teal-500/30 via-cyan-500/20 to-blue-500/30 border-teal-400/40 hover:from-teal-400/40 hover:via-cyan-400/30 hover:to-blue-400/40 hover:border-teal-300/60 text-white justify-start p-6 h-auto shadow-2xl hover:shadow-teal-500/30 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowUpDown className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-300" />
              <div className="text-left">
                <div className="font-bold text-lg">Jupiter</div>
                <div className="text-sm text-teal-100/90">Solana swap aggregator</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Swidge Subsection */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Swidge</h4>
            <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
          </div>
          
          {/* Primary App - Relay Bridge (Full Width) */}
          <div className="w-full">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://www.relay.link/bridge')}
              className="group w-full bg-gradient-to-br from-blue-500/40 via-indigo-500/30 to-purple-500/40 border-blue-400/50 hover:from-blue-400/50 hover:via-indigo-400/40 hover:to-purple-400/50 hover:border-blue-300/70 text-white justify-center p-8 h-auto shadow-2xl hover:shadow-blue-500/40 transform hover:scale-[1.02] transition-all duration-500 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-2xl flex items-center justify-center gap-3 mb-2">
                  <ArrowLeftRight className="w-7 h-7 group-hover:rotate-180 transition-transform duration-500" />
                  Relay Bridge
                </div>
                <div className="text-base text-blue-100/90 font-medium">Primary cross-chain asset bridging platform</div>
              </div>
            </Button>
          </div>

          {/* Other Apps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://jumper.exchange/')}
              className="group bg-gradient-to-br from-purple-600/30 via-violet-600/20 to-fuchsia-600/30 border-purple-400/40 hover:from-purple-500/40 hover:via-violet-500/30 hover:to-fuchsia-500/40 hover:border-purple-300/60 text-white justify-start p-5 h-auto shadow-xl hover:shadow-purple-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowLeftRight className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-300" />
              <div className="text-left">
                <div className="font-bold text-base">Jumper Exchange</div>
                <div className="text-sm text-purple-200/90">Multi-chain bridge aggregator</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.swing.xyz/swap?fromChain=base&fromToken=ETH&toChain=ethereum&toToken=SWING')}
              className="group bg-gradient-to-br from-orange-600/30 via-amber-600/20 to-yellow-600/30 border-orange-400/40 hover:from-orange-500/40 hover:via-amber-500/30 hover:to-yellow-500/40 hover:border-orange-300/60 text-white justify-start p-5 h-auto shadow-xl hover:shadow-orange-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowLeftRight className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-300" />
              <div className="text-left">
                <div className="font-bold text-base">Galaxy Swing</div>
                <div className="text-sm text-orange-200/90">Cross-chain swap protocol</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.debridge.finance/?inputChain=1&outputChain=8453&inputCurrency=&outputCurrency=&dlnMode=simple')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">deBridge</div>
                <div className="text-sm text-crypto-silver">Cross-chain liquidity and infrastructure</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Trading Terminals Subsection */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-fuchsia-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-300 bg-clip-text text-transparent">Trading Terminals</h4>
            <div className="flex-1 h-px bg-gradient-to-r from-purple-500/50 to-transparent"></div>
          </div>
          
          {/* Primary App - Definitive Edge (Full Width) */}
          <div className="w-full">
            <a
              href="https://app.definitive.fi/0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463/hyperevm"
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full bg-gradient-to-br from-purple-500/40 via-fuchsia-500/30 to-pink-500/40 border border-purple-400/50 hover:from-purple-400/50 hover:via-fuchsia-400/40 hover:to-pink-400/50 hover:border-purple-300/70 text-white justify-center p-8 h-auto rounded-lg transition-all duration-500 flex items-center shadow-2xl hover:shadow-purple-500/40 transform hover:scale-[1.02] backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-2xl flex items-center justify-center gap-3 mb-2">
                  <ArrowLeftRight className="w-7 h-7 group-hover:rotate-180 transition-transform duration-500" />
                  Definitive Edge
                </div>
                <div className="text-base text-purple-100/90 font-medium">Primary multi-chain trading terminal - Trade any token, on any chain</div>
              </div>
            </a>
          </div>

          {/* Other Apps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://ave.ai/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Ave.ai</div>
                <div className="text-sm text-crypto-silver">AI-powered multi-chain trading terminal</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://universalx.app/home')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-4 h-auto"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">UniversalX</div>
                <div className="text-sm text-crypto-silver">Trade any token, on any chain</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://o1.exchange/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-cyan-500/20 hover:border-cyan-500/30 text-white justify-start p-4 h-auto"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">O1 Exchange</div>
                <div className="text-sm text-crypto-silver">Advanced trading on Base and Solana</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://www.ourbit.com/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-4 h-auto"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">OurBit</div>
                <div className="text-sm text-crypto-silver">CEX & DEX, Spot & Futures</div>
              </div>
            </Button>

          </div>
        </div>

        {/* Perps Subsection */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-300 bg-clip-text text-transparent">Perps</h4>
            <div className="flex-1 h-px bg-gradient-to-r from-orange-500/50 to-transparent"></div>
          </div>
          
          {/* Primary Apps Row - Hyperliquid & DeFi.app */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.hyperliquid.xyz/trade')}
              className="group w-full bg-gradient-to-br from-teal-500/40 via-cyan-500/30 to-blue-500/40 border-teal-400/50 hover:from-teal-400/50 hover:via-cyan-400/40 hover:to-blue-400/50 hover:border-teal-300/70 text-white justify-start p-7 h-auto shadow-2xl hover:shadow-teal-500/30 transform hover:scale-[1.02] transition-all duration-500 backdrop-blur-sm"
            >
              <TrendingUp className="w-6 h-6 mr-4 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500" />
              <div className="text-left">
                <div className="font-bold text-xl">Hyperliquid</div>
                <div className="text-sm text-teal-100/90 font-medium">Primary onchain perpetual DEX platform</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.defi.app/portfolio')}
              className="group w-full bg-gradient-to-br from-blue-500/40 via-indigo-500/30 to-purple-500/40 border-blue-400/50 hover:from-blue-400/50 hover:via-indigo-400/40 hover:to-purple-400/50 hover:border-blue-300/70 text-white justify-start p-7 h-auto shadow-2xl hover:shadow-blue-500/30 transform hover:scale-[1.02] transition-all duration-500 backdrop-blur-sm"
            >
              <Wallet className="w-6 h-6 mr-4 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500" />
              <div className="text-left">
                <div className="font-bold text-xl">DeFi.app</div>
                <div className="text-sm text-blue-100/90 font-medium">Primary onchain perpetuals super app</div>
              </div>
            </Button>
          </div>

          {/* Other Apps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://quanto.trade/en/markets/BTC-USD-SWAP-LIN')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Quanto</div>
                <div className="text-sm text-crypto-silver">Perpetual futures trading</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://perps.saros.xyz/trade/PERP_SOL_USDC')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-yellow-500/20 hover:border-yellow-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Saros</div>
                <div className="text-sm text-crypto-silver">Solana perpetual futures</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://perps.raydium.io/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Raydium</div>
                <div className="text-sm text-crypto-silver">Solana perpetual futures</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://pro.edgex.exchange/trade/BTCUSD')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-yellow-500/20 hover:border-yellow-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">EdgeX Pro</div>
                <div className="text-sm text-crypto-silver">Perpetual futures trading</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://trade.perpsdao.xyz/en/perp/PERP_BTC_USDC')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">PerpsDAO</div>
                <div className="text-sm text-crypto-silver">Decentralized perpetual futures</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.extended.exchange/perp')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Extended Exchange</div>
                <div className="text-sm text-crypto-silver">Perpetual futures platform</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://www.novaex.com/trade')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">NovaEx</div>
                <div className="text-sm text-crypto-silver">Insurance-backed perpetual trading</div>
              </div>
            </Button>

          </div>
        </div>

        {/* Options Subsection */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-green-400 mb-3">Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://www.hegic.co/app#/arbitrum/trade/new')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Hegic</div>
                <div className="text-sm text-crypto-silver">Decentralized options protocol</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://deri.io/#/lite/trade/option/BTCUSD-50000-P')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Deri Protocol</div>
                <div className="text-sm text-crypto-silver">Bitcoin options trading</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://tradoor.io/trade/btc_usdt')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Tradoor</div>
                <div className="text-sm text-crypto-silver">Crypto perps and options</div>
              </div>
            </Button>

          </div>
        </div>
        </div>
      </GlassCard>

      {/* Multi-Charts Section */}
      <div className="mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-cyan-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-white">Multi-Charts</h4>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
              CHARTING
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://dexscreener.com/multicharts?theme=dark')}
            className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm ml-auto"
          >
            Open Full View →
          </button>
        </div>
        <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h5 className="text-xl font-semibold text-white mb-2">Multi-Charts</h5>
              <p className="text-gray-400 text-sm mb-4">
                Multi-Chart Tracking for Watchlist and Active Trades
              </p>
              <button
                onClick={() => openInNewTab('https://dexscreener.com/multicharts?theme=dark')}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Open Multi-Charts Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Token Sniffer */}
      <div className="space-y-8 mt-12">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Token Sniffer</h3>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                AI CHAT
              </Badge>
            </div>
            <button
              onClick={() => openInNewTab('https://wach.ai/chat')}
              className="text-yellow-400 hover:text-yellow-300 text-sm"
            >
              Open in New Tab →
            </button>
          </div>
          <div className="mb-6">
            <SafeIframe
              src="https://wach.ai/chat"
              title="WachAI Chat Interface"
              className="w-full h-[500px] rounded-lg border border-crypto-silver/20"
            />
          </div>

          {/* Bubblemaps */}
          <div className="mb-6">
            <SafeLink
              href='https://bubblemaps.io/'
              className="w-full p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors block"
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-purple-400 font-semibold">Bubblemaps</h4>
              </div>
              <p className="text-gray-400 text-sm">Token Analytics & Visualization</p>
            </SafeLink>
          </div>
        </GlassCard>
      </div>

    </div>
  );
}