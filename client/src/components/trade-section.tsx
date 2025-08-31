import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeftRight, TrendingUp, ExternalLink, Wallet } from "lucide-react";
import { openSecureLink } from "@/utils/security";

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

// Glass card component for Trade section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

// Use secure link opening
const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function TradeSection() {
  return (
    <div className="space-y-8">
      {/* TRADE Section - Moved to top center */}
      <div className="text-center px-3 sm:px-0">
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <ArrowLeftRight className="text-white text-xl" />
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">TRADE</h2>
        </div>
        <p className="text-sm sm:text-base text-crypto-silver">Cross-chain trading and exchange platforms</p>
      </div>

      {/* Cross-Chain Section */}
      <div className="space-y-6">
        
        {/* Swidge Subsection */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-blue-400 mb-3">Swidge</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              onClick={() => openInNewTab('https://jumper.exchange/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-4 h-auto"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Jumper Exchange</div>
                <div className="text-sm text-crypto-silver">Multi-chain bridge aggregator</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.swing.xyz/swap?fromChain=base&fromToken=ETH&toChain=ethereum&toToken=SWING')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-4 h-auto"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Galaxy Swing</div>
                <div className="text-sm text-crypto-silver">Cross-chain swap protocol</div>
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
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-purple-400 mb-3">Trading Terminals</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="https://app.definitive.fi/0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463/hyperevm"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black/20 border border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-4 h-auto rounded-md transition-colors flex items-center"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Definitive Edge</div>
                <div className="text-sm text-crypto-silver">Trade any token, on any chain</div>
              </div>
            </a>

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
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-orange-400 mb-3">Perps</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.hyperliquid.xyz/trade')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-indigo-500/20 hover:border-indigo-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Hyperliquid</div>
                <div className="text-sm text-crypto-silver">Onchain perpetual DEX</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openInNewTab('https://app.defi.app/portfolio')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-4 h-auto"
            >
              <Wallet className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">DeFi.app</div>
                <div className="text-sm text-crypto-silver">Onchain Perpetuals Super App</div>
              </div>
            </Button>

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
              onClick={() => openInNewTab('https://limitless.exchange/advanced')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Limitless Exchange</div>
                <div className="text-sm text-crypto-silver">Predict future crypto and stocks prices</div>
              </div>
            </Button>

          </div>
        </div>
      </div>

      {/* Multi-Charts Section */}
      <div className="mt-8">
        <div className="flex justify-end mb-3">
          <SafeLink
            href="https://dexscreener.com/multicharts?theme=dark"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </SafeLink>
        </div>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
          <SafeIframe
            src="https://dexscreener.com/multicharts?theme=dark"
            title="Multi-Charts"
            className="w-full h-[600px] border-0"
          />
        </div>
      </div>


    </div>
  );
}