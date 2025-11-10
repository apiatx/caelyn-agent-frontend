import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Wallet, ExternalLink, Activity } from "lucide-react";
import { openSecureLink, getSecureIframeProps, getSecureLinkProps } from "@/utils/security";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import tradeIcon from "@assets/3676668_1757212085729.png";
import hyperliquidLogo from "@assets/hyperliquid-logo_1755977414943.png";
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
        style={{ opacity: headerOpacity, pointerEvents: headerOpacity < 0.1 ? 'none' : 'auto' }}
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
              
              {/* Hyperliquid Trading */}
              <div className="mb-6">
                <div className="flex justify-end mb-3">
                  <a
                    {...getSecureLinkProps('https://app.hyperliquid.xyz/trade/HYPE')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    Open Full View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
                  <iframe
                    {...getSecureIframeProps('https://app.hyperliquid.xyz/trade/HYPE', 'Hyperliquid HYPE Trading')}
                    className="w-full h-[800px] border-0"
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    Live HYPE trading on Hyperliquid • Real-time orderbook and charts
                  </p>
                </div>
              </div>

              {/* DeFiLlama Derivatives */}
              <div className="mb-6">
                <div className="flex justify-end mb-3">
                  <a
                    {...getSecureLinkProps('https://defillama.com/protocols/derivatives')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    Open Full View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
                  <SafeIframe
                    src="https://defillama.com/protocols/derivatives"
                    title="DeFiLlama Derivatives Protocols"
                    className="w-full h-[800px] border-0"
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    DeFi derivatives protocols overview • Market analytics and TVL metrics
                  </p>
                </div>
              </div>

              {/* Vooi.io Iframe */}
              <div className="mb-6">
                <div className="flex justify-end mb-3">
                  <a
                    {...getSecureLinkProps('https://pro.vooi.io/')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    Open Full View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
                  <SafeIframe
                    src="https://pro.vooi.io/"
                    title="Vooi.io Pro Trading"
                    className="w-full h-[800px] border-0"
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    Professional perpetual trading on Vooi.io • Advanced trading interface
                  </p>
                </div>
              </div>

              {/* Avantisfi Iframe */}
              <div className="mb-6">
                <div className="flex justify-end mb-3">
                  <a
                    {...getSecureLinkProps('https://www.avantisfi.com/trade?asset=BTC-USD')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    Open Full View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
                  <SafeIframe
                    src="https://www.avantisfi.com/trade?asset=BTC-USD"
                    title="Avantisfi Trading Terminal"
                    className="w-full h-[800px] border-0"
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    BTC-USD perpetual trading on Avantisfi • Advanced derivatives platform
                  </p>
                </div>
              </div>

              {/* All Perps Platforms - Organized in Clean 3-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.lighter.xyz/trade/ETH')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-blue-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-lighter"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Lighter
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://www.apex.exchange/en/trade/perpetual/BTCUSDT')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-apex"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Apex Exchange
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.defi.app/portfolio')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-defi-app"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <Wallet className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      DeFi.app
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://www.paradex.trade/')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-paradex"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Paradex
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.based.one/BTC')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-orange-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-based-one"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Based.one
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://omni.variational.io/perpetual/BTC')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-purple-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-omni-variational"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Omni variational
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://perps.thena.fi/trade/BTCUSDT')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-thena-perps"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Thena Perps
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.aevo.xyz/perpetual/eth')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-aevo"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Aevo
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.aark.digital/dashboard')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-aark"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <Activity className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Aark Digital
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.vooi.io/')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-vooi"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Vooi
                    </div>
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
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://www.app.ranger.finance/perps')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-ranger"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Ranger Finance
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://portal.bouncebit.io/trade')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-bouncebit"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      BounceBit
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://dydx.trade/trade/BTC-USD')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-dydx"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      dYdX
                    </div>
                  </div>
                </Button>

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
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.gmx.io/#/trade')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-gmx"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      GMX
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.drift.trade/BTC-PERP')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-drift"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Drift
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://www.asterdex.com/en/futures/v1/BTCUSDT')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-asterdex"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      AsterDex
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.pacifica.fi/agent/BTC')}
                  className="group bg-black/20 border-crypto-silver/20 hover:bg-gray-500/20 hover:border-gray-500/30 text-white justify-center p-5 h-auto shadow-lg hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid="button-pacifica"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Pacifica
                    </div>
                  </div>
                </Button>
              </div>


              {/* BloFin - Full Width Colored Button */}
              <div className="w-full mt-6">
                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://blofin.com/en/market/derivatives')}
                  className="group w-full bg-gradient-to-br from-blue-500/40 via-purple-500/30 to-indigo-500/40 border border-blue-400/50 hover:from-blue-400/50 hover:via-purple-400/40 hover:to-indigo-400/50 hover:border-blue-300/70 text-white justify-center p-8 h-auto rounded-lg transition-all duration-500 flex items-center shadow-2xl hover:shadow-blue-500/40 transform hover:scale-[1.02] backdrop-blur-sm"
                  data-testid="button-blofin"
                >
                  <div className="text-center">
                    <div className="font-bold text-2xl flex items-center justify-center gap-3 mb-2">
                      <TrendingUp className="w-7 h-7 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500" />
                      BloFin
                    </div>
                    <div className="text-base text-blue-100/90 font-medium">Advanced perpetual futures trading platform</div>
                  </div>
                </Button>
              </div>

              {/* SuperP - Iframe */}
              <div className="mb-6 mt-6">
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://noliquidation.superp.xyz/en"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[800px] rounded-lg border border-crypto-silver/20"
                    title="SuperP"
                    frameBorder="0"
                    scrolling="yes"
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    No liquidation perpetual futures • SuperP trading platform
                  </p>
                </div>
              </div>

            </div>
          </GlassCard>

          {/* Memes Section */}
          <GlassCard className="p-8">
            <div className="space-y-6">
              {/* Memes Section Header */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">Memes</h1>
                </div>
                <p className="text-crypto-silver">Meme token trading and perpetual futures</p>
              </div>

              {/* Uranus */}
              <div className="mb-6">
                <div className="flex justify-end mb-3">
                  <a
                    href="https://uranus.ag/trade/?token=BFgdzMkTPdKKJeTipv2njtDEwhKxkgFueJQfJGt1jups"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    Open Full View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
                  <SafeIframe
                    src="https://uranus.ag/trade/?token=BFgdzMkTPdKKJeTipv2njtDEwhKxkgFueJQfJGt1jups"
                    title="Uranus DEX"
                    className="w-full h-[600px] border-0"
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    Uranus DEX trading platform • Decentralized exchange for meme tokens
                  </p>
                </div>
              </div>

              {/* Quanto - Full Width Enhanced Colored Button */}
              <div className="w-full mt-6">
                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://quanto.trade/en/markets/BTC-USD-SWAP-LIN')}
                  className="group w-full bg-gradient-to-br from-orange-500/40 via-red-500/30 to-pink-500/40 border border-orange-400/50 hover:from-orange-400/50 hover:via-red-400/40 hover:to-pink-400/50 hover:border-orange-300/70 text-white justify-center p-8 h-auto rounded-lg transition-all duration-500 flex items-center shadow-2xl hover:shadow-orange-500/40 transform hover:scale-[1.02] backdrop-blur-sm"
                  data-testid="button-quanto"
                >
                  <div className="text-center">
                    <div className="font-bold text-2xl flex items-center justify-center gap-3 mb-2">
                      <TrendingUp className="w-7 h-7 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500" />
                      Quanto
                    </div>
                    <div className="text-base text-orange-100/90 font-medium">Next-generation perpetual futures trading</div>
                  </div>
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Analyze Section */}
          <GlassCard className="p-8">
            <div className="space-y-6">
              {/* Analyze Section Header */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                    <img src={hyperliquidLogo} alt="HyperLiquid" className="w-8 h-8 rounded-lg" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">Analyze</h1>
                </div>
                <p className="text-crypto-silver">Advanced market analytics and trading insights</p>
              </div>

              {/* CoinGlass Main Analytics */}
              <div className="mb-6">
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://www.coinglass.com/"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="CoinGlass"
                    frameBorder="0"
                    scrolling="yes"
                  />
                </div>
              </div>

              {/* HyperDash */}
              <div className="mt-6">
                <div className="flex justify-end mb-3">
                  <a
                    href="https://hyperdash.info/analytics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    Open Full View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
                  <iframe
                    src="https://hyperdash.info/analytics"
                    className="w-full h-[600px] border-0"
                    title="Hyperdash Analytics"
                    allow="clipboard-read; clipboard-write"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    Hyperliquid ecosystem analytics • Volume, TVL, and performance metrics
                  </p>
                </div>
              </div>

              {/* CoinGlass Hyperliquid Whale Tracker */}
              <div className="mt-6">
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://www.coinglass.com/hyperliquid"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="CoinGlass Hyperliquid"
                    frameBorder="0"
                    scrolling="yes"
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    Hyperliquid whale tracker • CoinGlass analytics and insights
                  </p>
                </div>
              </div>

              {/* CoinGlass HL Analytics */}
              <div className="mt-6">
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://www.coinglass.com/hl"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="CoinGlass HL Analytics"
                    frameBorder="0"
                    scrolling="yes"
                  />
                </div>
              </div>

              {/* Copy Trade / Top Wallets Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">CT</span>
                  </div>
                  Copy Trade / Top Wallets
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
                    VAULT STRATEGY
                  </span>
                </h3>
                
                <div className="bg-black/20 border border-crypto-silver/20 rounded-lg p-6">
                  {/* Hyperbot Network Iframe - Moved to Copy Trade Section */}
                  <div className="mb-6 w-full bg-black/20 border border-crypto-silver/20 rounded-lg p-4 shadow-lg">
                    <SafeIframe
                      src="https://hyperbot.network/discover"
                      title="Hyperbot Network Discover"
                      className="w-full h-[800px] rounded-lg"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => window.open('https://app.hyperliquid.xyz/vaults/0xe11b12a81ad743ae805078b0da61e9166475a829', '_blank')}
                      className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-purple-500/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">V</span>
                        </div>
                        <div className="text-left">
                          <h4 className="text-white font-medium text-sm">DegenAI Vault</h4>
                          <p className="text-gray-400 text-xs">Copy trading vault strategy - 0xe11b12a81ad743ae805078b0da61e9166475a829</p>
                        </div>
                      </div>
                      <div className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors">→</div>
                    </button>

                    <button
                      onClick={() => window.open('https://degenai.dev/', '_blank')}
                      className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-pink-500/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">AI</span>
                        </div>
                        <div className="text-left">
                          <h4 className="text-white font-medium text-sm">DegenAI Perps Bot</h4>
                          <p className="text-gray-400 text-xs">AI-powered perpetual trading bot - Advanced trading automation</p>
                        </div>
                      </div>
                      <div className="w-4 h-4 text-gray-400 group-hover:text-pink-400 transition-colors">→</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* CoinMarketMan HyperTracker */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">C</span>
                  </div>
                  HyperTracker
                  <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/30">
                    TRACKER
                  </span>
                </h3>
                
                <div className="bg-black/20 border border-crypto-silver/20 rounded-lg p-6">
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => window.open('https://app.coinmarketman.com/hypertracker', '_blank', 'noopener,noreferrer')}
                      className="bg-gradient-to-br from-orange-500/10 to-red-600/10 hover:from-orange-500/20 hover:to-red-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">Perp Trader Sentiment</div>
                          <div className="text-xs text-crypto-silver">Real-time trader sentiment analysis</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                      </div>
                    </button>
                  </div>
                  
                  {/* Portfolio Subsection */}
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-orange-400 mb-3 flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">P</span>
                      </div>
                      Portfolio
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => window.open('https://app.coinmarketman.com/hypertracker', '_blank', 'noopener,noreferrer')}
                        className="bg-gradient-to-br from-orange-500/10 to-red-600/10 hover:from-orange-500/20 hover:to-red-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">Portfolio Analytics</div>
                            <div className="text-xs text-crypto-silver">Comprehensive portfolio tracking and metrics</div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                        </div>
                      </button>
                      
                      <button
                        onClick={() => window.open('https://app.coinmarketman.com/dashboard/intelligence?tab=open_positions', '_blank', 'noopener,noreferrer')}
                        className="bg-gradient-to-br from-orange-500/10 to-red-600/10 hover:from-orange-500/20 hover:to-red-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">Wallet Intelligence</div>
                            <div className="text-xs text-crypto-silver">Open positions and perpetual futures intelligence</div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}