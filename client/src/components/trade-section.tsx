import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, TrendingUp, ExternalLink, Wallet, ArrowUpDown } from "lucide-react";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import tradeIcon from "@assets/3676668_1757212085729.png";

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
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300 overflow-hidden">
            <img 
              src={tradeIcon} 
              alt="Trade Icon" 
              className="w-16 h-16 object-contain filter invert"
            />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">Trade</h2>
        </div>
        <p className="text-lg text-white/80 font-medium tracking-wide">Premium Cross-Chain Trading & Exchange Platforms</p>
        <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Swap Section */}
      <GlassCard className="p-8">
        {/* Swap Subsection */}
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
                <ArrowUpDown className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-300 bg-clip-text text-transparent">Swap</h4>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.uniswap.org')}
              className="group bg-gradient-to-br from-pink-500/30 via-pink-600/20 to-rose-600/30 border-pink-400/40 hover:from-pink-400/40 hover:via-pink-500/30 hover:to-rose-500/40 hover:border-pink-300/60 text-white justify-center p-6 h-auto shadow-2xl hover:shadow-pink-500/30 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-lg flex items-center justify-center">
                  <ArrowUpDown className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  Uniswap
                </div>
                <div className="text-sm text-pink-100/90">Leading DEX on Ethereum</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://pancakeswap.finance/swap')}
              className="group bg-gradient-to-br from-yellow-500/30 via-amber-500/20 to-orange-500/30 border-yellow-400/40 hover:from-yellow-400/40 hover:via-amber-400/30 hover:to-orange-400/40 hover:border-yellow-300/60 text-white justify-center p-6 h-auto shadow-2xl hover:shadow-yellow-500/30 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-lg flex items-center justify-center">
                  <ArrowUpDown className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  PancakeSwap
                </div>
                <div className="text-sm text-yellow-100/90">Popular BSC DEX</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://jup.ag')}
              className="group bg-gradient-to-br from-teal-500/30 via-cyan-500/20 to-blue-500/30 border-teal-400/40 hover:from-teal-400/40 hover:via-cyan-400/30 hover:to-blue-400/40 hover:border-teal-300/60 text-white justify-center p-6 h-auto shadow-2xl hover:shadow-teal-500/30 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-lg flex items-center justify-center">
                  <ArrowUpDown className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  Jupiter
                </div>
                <div className="text-sm text-teal-100/90">Solana swap aggregator</div>
              </div>
            </Button>
          </div>

          {/* Matcha.xyz iframe */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h5 className="text-lg font-semibold text-white">Matcha</h5>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                DEX AGGREGATOR
              </Badge>
            </div>
            <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
              <iframe
                src="https://matcha.xyz/tokens/ethereum/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                title="Matcha DEX Aggregator"
                frameBorder="0"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Swidge Section */}
      <GlassCard className="p-8">
        {/* Swidge Subsection */}
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Swidge</h4>
            </div>
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
              className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-base flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  Jumper Exchange
                </div>
                <div className="text-sm text-gray-300">Multi-chain bridge aggregator</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.swing.xyz/swap?fromChain=base&fromToken=ETH&toChain=ethereum&toToken=SWING')}
              className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-base flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  Galaxy Swing
                </div>
                <div className="text-sm text-gray-300">Cross-chain swap protocol</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.debridge.finance/?inputChain=1&outputChain=8453&inputCurrency=&outputCurrency=&dlnMode=simple')}
              className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-base flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  deBridge
                </div>
                <div className="text-sm text-gray-300">Cross-chain liquidity and infrastructure</div>
              </div>
            </Button>
          </div>

          {/* DODO and XY Finance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.dodoex.io/swap/network/mainnet/1-ETH/56-%24BeAI')}
              className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-base flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  DODO
                </div>
                <div className="text-sm text-gray-300">Decentralized exchange protocol</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.xy.finance/')}
              className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-base flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  XY Finance
                </div>
                <div className="text-sm text-gray-300">Cross-chain swap aggregator</div>
              </div>
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Multi-Chain Trading Terminals Section */}
      <GlassCard className="p-8">
        {/* Trading Terminals Subsection */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-fuchsia-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-300 bg-clip-text text-transparent">Multi-Chain Trading Terminals</h4>
            </div>
            <button
              onClick={() => openInNewTab('https://app.tabtrader.com/trading?list=Spot&market=BINANCE&pair=BTCUSDT')}
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2 bg-black/20 border border-blue-500/30 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-all duration-300"
              data-testid="button-tabtrader-external"
            >
              <ExternalLink className="w-4 h-4" />
              Open Full View
            </button>
          </div>

          {/* TabTrader Terminal */}
          <iframe
            src="https://app.tabtrader.com/trading?list=Spot&market=BINANCE&pair=BTCUSDT"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20 mb-6"
            title="TabTrader Terminal"
            frameBorder="0"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
            data-testid="iframe-tabtrader"
          />

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://www.ourbit.com/')}
              className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-base flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  OurBit
                </div>
                <div className="text-sm text-gray-300">CEX & DEX, Spot & Futures</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://universalx.app/home')}
              className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-base flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  UniversalX
                </div>
                <div className="text-sm text-gray-300">Trade any token, on any chain</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://o1.exchange/')}
              className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-base flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  O1 Exchange
                </div>
                <div className="text-sm text-gray-300">Advanced trading on Base and Solana</div>
              </div>
            </Button>

          </div>

          {/* Ave.ai - Simple Black Button */}
          <div className="w-full">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://ave.ai/')}
              className="group w-full bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="font-bold text-base flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  Ave.ai
                </div>
                <div className="text-sm text-gray-300">AI-powered multi-chain trading terminal</div>
              </div>
            </Button>
          </div>

        </div>
      </GlassCard>


      {/* DEX Aggregator */}
      <GlassCard className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">DEX Aggregator</h4>
          </div>
          <button
            onClick={() => openInNewTab('https://app.rubic.exchange/?fromChain=ETH&toChain=ETH')}
            className="text-green-300 hover:text-green-200 text-sm font-medium bg-green-500/20 px-4 py-2 rounded-lg border border-green-400/30 hover:bg-green-500/30 transition-all duration-300"
            data-testid="button-rubic-external"
          >
            Open Full View →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://app.rubic.exchange/?fromChain=ETH&toChain=ETH"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Rubic Exchange"
            frameBorder="0"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
            data-testid="iframe-rubic"
          />
        </div>
      </GlassCard>

      {/* Multi-Charts Section */}
      <GlassCard className="p-8">
        <div className="w-full bg-gradient-to-br from-slate-900/80 via-gray-900/80 to-cyan-900/30 rounded-2xl border border-cyan-400/20 p-12 text-center shadow-2xl">
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/30 hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-12 h-12 text-white" />
            </div>
            <div>
              <h5 className="text-3xl font-bold text-white mb-3">Multi-Charts Dashboard</h5>
              <p className="text-cyan-200/80 text-lg mb-6 max-w-md mx-auto">
                Advanced Multi-Chart Tracking for Watchlist and Active Trades
              </p>
              <button
                onClick={() => openInNewTab('https://dexscreener.com/multicharts?theme=dark')}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-8 py-4 rounded-xl transition-all duration-300 text-lg font-semibold shadow-2xl hover:shadow-cyan-500/30 transform hover:scale-105"
              >
                Open Multi-Charts Dashboard
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

    </div>
  );
}