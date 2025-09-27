import { useState, Suspense } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ExternalLink, Zap, Activity } from "lucide-react";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import { SectionLoadingState } from "@/components/loading-screen";
import { useScrollFade } from "@/hooks/useScrollFade";

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

// Enhanced glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-gradient-to-br from-black/60 via-black/40 to-transparent backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 ${className}`}>
    {children}
  </Card>
);

// Use secure link opening
const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function TradeOptionsPage() {
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

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-12 p-6">
          {/* OPTIONS Section - Enhanced Header */}
          <div className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 blur-3xl -z-10"></div>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300">
                <Zap className="w-10 h-10 text-black" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-yellow-200 to-orange-200 bg-clip-text text-transparent">Options Trading</h2>
            </div>
            <p className="text-lg text-white/80 font-medium tracking-wide">Advanced Options Trading Platforms & Tools</p>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Options Section */}
          <GlassCard className="p-8">
            {/* Options Subsection */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://www.hegic.co/app#/arbitrum/trade/new')}
                  className="group bg-gradient-to-br from-green-600/30 via-emerald-600/20 to-teal-600/30 border-green-400/40 hover:from-green-500/40 hover:via-emerald-500/30 hover:to-teal-500/40 hover:border-green-300/60 text-white justify-center p-5 h-auto shadow-xl hover:shadow-green-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Hegic
                    </div>
                    <div className="text-sm text-green-200/90">Decentralized options protocol</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://deri.io/#/lite/trade/option/BTCUSD-50000-P')}
                  className="group bg-gradient-to-br from-teal-600/30 via-cyan-600/20 to-blue-600/30 border-teal-400/40 hover:from-teal-500/40 hover:via-cyan-500/30 hover:to-blue-500/40 hover:border-teal-300/60 text-white justify-center p-5 h-auto shadow-xl hover:shadow-teal-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Deri Protocol
                    </div>
                    <div className="text-sm text-teal-200/90">Bitcoin options trading</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://www.binance.com/en/futures/BTC_USDT')}
                  className="group bg-gradient-to-br from-lime-600/30 via-green-600/20 to-emerald-600/30 border-lime-400/40 hover:from-lime-500/40 hover:via-green-500/30 hover:to-emerald-500/40 hover:border-lime-300/60 text-white justify-center p-5 h-auto shadow-xl hover:shadow-lime-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Tradoor
                    </div>
                    <div className="text-sm text-lime-200/90">Crypto perps and options</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://www.stryke.xyz/en/dashboard')}
                  className="group bg-gradient-to-br from-orange-600/30 via-amber-600/20 to-yellow-600/30 border-orange-400/40 hover:from-orange-500/40 hover:via-amber-500/30 hover:to-yellow-500/40 hover:border-orange-300/60 text-white justify-center p-5 h-auto shadow-xl hover:shadow-orange-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      Stryke
                    </div>
                    <div className="text-sm text-orange-200/90">Decentralized options trading</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openInNewTab('https://app.gammaswap.com/trade/mainnet/0xccaab6d7bee6d60bceeec0924f2ea188efa3d39f')}
                  className="group bg-gradient-to-br from-purple-600/30 via-violet-600/20 to-indigo-600/30 border-purple-400/40 hover:from-purple-500/40 hover:via-violet-500/30 hover:to-indigo-500/40 hover:border-purple-300/60 text-white justify-center p-5 h-auto shadow-xl hover:shadow-purple-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <div className="font-bold text-base flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      GammaSwap
                    </div>
                    <div className="text-sm text-purple-200/90">Gamma trading platform</div>
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