import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Wallet } from "lucide-react";
import { openSecureLink } from "@/utils/security";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import tradeIcon from "@assets/3676668_1757212085729.png";
import { UniversalNavigation } from "@/components/universal-navigation";
import { useScrollFade } from "@/hooks/useScrollFade";

// Safe iframe component
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

// Enhanced glass card component for Perps section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-gradient-to-br from-black/60 via-black/40 to-transparent backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 ${className}`}>
    {children}
  </Card>
);

// Use secure link opening
const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function TradePerpsPage() {
  const headerOpacity = useScrollFade(30, 120);

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header 
        className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300 relative overflow-hidden" 
        style={{ opacity: headerOpacity }}
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage: `url(${newHeaderBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {/* Content Layer */}
        <div className="relative z-10 max-w-[95vw] mx-auto px-2 sm:px-3">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-lg">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white drop-shadow-lg">
                CryptoHippo
              </h1>
            </div>
            {/* Top-right crypto image */}
            <div className="hidden sm:flex items-center">
              <img 
                src={criptomonedas}
                alt="Crypto Coins"
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-lg"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="trade-perps" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-12 p-6">
          {/* PERPS Section - Enhanced Header */}
          <div className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 blur-3xl -z-10"></div>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-orange-400 shadow-2xl hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img 
                  src={tradeIcon} 
                  alt="Trade Icon" 
                  className="w-16 h-16 object-contain filter invert"
                />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-orange-200 to-red-200 bg-clip-text text-transparent">Perpetual Futures</h2>
            </div>
            <p className="text-lg text-white/80 font-medium tracking-wide">Advanced Perpetual Futures Trading Platforms</p>
            <div className="w-32 h-1 bg-gradient-to-r from-orange-500 to-red-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Perps Section */}
          <GlassCard className="p-8">
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-300 bg-clip-text text-transparent">Perps</h4>
                </div>
              </div>
              
              {/* Hyperliquid Iframe */}
              <div className="w-full bg-black/20 border border-crypto-silver/20 rounded-lg p-4 shadow-lg mb-8">
                <SafeIframe
                  src="https://app.hyperliquid.xyz/trade"
                  title="Hyperliquid Trading Terminal"
                  className="w-full h-[800px] rounded-lg"
                />
              </div>

              {/* Avantisfi Iframe */}
              <div className="w-full bg-black/20 border border-crypto-silver/20 rounded-lg p-4 shadow-lg mb-8">
                <SafeIframe
                  src="https://www.avantisfi.com/trade?asset=BTC-USD"
                  title="Avantisfi Trading Terminal"
                  className="w-full h-[800px] rounded-lg"
                />
              </div>

              {/* DeFi.app - Full Width Primary Button */}
              <Button
                variant="outline"
                onClick={() => openInNewTab('https://app.defi.app/portfolio')}
                className="group w-full bg-gradient-to-br from-blue-500/40 via-indigo-500/30 to-purple-500/40 border-blue-400/50 hover:from-blue-400/50 hover:via-indigo-400/40 hover:to-purple-400/50 hover:border-blue-300/70 text-white justify-center p-7 h-auto shadow-2xl hover:shadow-blue-500/30 transform hover:scale-[1.02] transition-all duration-500 backdrop-blur-sm mb-8"
                data-testid="button-defi-app"
              >
                <div className="text-center">
                  <div className="font-bold text-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500" />
                    DeFi.app
                  </div>
                  <div className="text-sm text-blue-100/90 font-medium">Primary onchain perpetuals super app</div>
                </div>
              </Button>

              {/* Paradex - Full Width Button */}
              <Button
                variant="outline"
                onClick={() => openInNewTab('https://app.paradex.trade/trade/BTC-USD-PERP')}
                className="group w-full bg-gradient-to-br from-white/40 via-gray-100/30 to-white/40 border-white/50 hover:from-white/50 hover:via-gray-100/40 hover:to-white/50 hover:border-white/70 text-black justify-center p-7 h-auto shadow-2xl hover:shadow-white/30 transform hover:scale-[1.02] transition-all duration-500 backdrop-blur-sm mb-8"
                data-testid="button-paradex"
              >
                <div className="text-center">
                  <div className="font-bold text-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500" />
                    Paradex
                  </div>
                  <div className="text-sm text-gray-800 font-medium">Advanced perpetual futures trading</div>
                </div>
              </Button>

              {/* Other Apps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://quanto.trade/en/markets/BTC-USD-SWAP-LIN')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-quanto"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Quanto
                    </div>
                    <div className="text-sm text-gray-300">Perpetual futures trading</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://perps.saros.xyz/trade/PERP_SOL_USDC')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-saros"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Saros
                    </div>
                    <div className="text-sm text-gray-300">Solana perpetual futures</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://perps.raydium.io/')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-raydium"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Raydium
                    </div>
                    <div className="text-sm text-gray-300">Solana perpetual futures</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://pro.edgex.exchange/trade/BTCUSD')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-edgex"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      EdgeX Pro
                    </div>
                    <div className="text-sm text-gray-300">Perpetual futures trading</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://trade.perpsdao.xyz/en/perp/PERP_BTC_USDC')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-perpsdao"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      PerpsDAO
                    </div>
                    <div className="text-sm text-gray-300">Decentralized perpetual futures</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.extended.exchange/perp')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-extended"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Extended Exchange
                    </div>
                    <div className="text-sm text-gray-300">Perpetual futures platform</div>
                  </div>
                </Button>

              </div>

              {/* NovaEx, MYX and MYC */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://www.novaex.com/trade')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-novaex"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      NovaEx
                    </div>
                    <div className="text-sm text-gray-300">Insurance-backed perpetual trading</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.myx.finance/trade/BTCUSDC')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-myx"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      MYX
                    </div>
                    <div className="text-sm text-gray-300">Perpetual futures platform</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.myx.finance/trade/BTCUSDC')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-myc"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      MYC
                    </div>
                    <div className="text-sm text-gray-300">Zero-slippage perps</div>
                  </div>
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}