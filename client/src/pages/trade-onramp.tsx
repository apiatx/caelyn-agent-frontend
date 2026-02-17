import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { openSecureLink } from "@/utils/security";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import { useScrollFade } from "@/hooks/useScrollFade";

// Glass card component for On Ramp section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

// Use secure link opening
const openInNewTab = (url: string) => {
  openSecureLink(url);
};

export default function TradeOnRampPage() {
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
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">On Ramp</h1>
                <p className="text-sm sm:text-base text-white/70 font-medium mt-1">Fiat to crypto onboarding platforms</p>
              </div>
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
        <div className="space-y-8">
          {/* On Ramp - Enhanced Header */}
          <div className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 blur-3xl -z-10"></div>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-blue-400 shadow-2xl hover:scale-110 transition-transform duration-300 overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500">
                <Wallet className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">On Ramp</h2>
            </div>
            <p className="text-lg text-white/80 font-medium tracking-wide">Fiat to crypto onboarding platforms</p>
            <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* On Ramp Glass Card */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Wallet className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">On Ramp</h3>
                <p className="text-crypto-silver">Fiat to crypto onboarding platforms</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                onClick={() => openInNewTab('https://www.coinbase.com/home')}
                className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
                data-testid="button-coinbase"
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
                data-testid="button-kraken"
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
                onClick={() => openInNewTab('https://www.moonpay.com/buy')}
                className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-6 h-auto flex-col space-y-2"
                data-testid="button-moonpay"
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
                data-testid="button-strike"
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

            {/* ZKP2P Big Button - Full width */}
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => openInNewTab('https://www.zkp2p.xyz/swap?tab=buy')}
                className="w-full p-6 text-center bg-gradient-to-b from-cyan-600/10 to-teal-700/10 hover:from-cyan-600/20 hover:to-teal-700/20 border border-cyan-600/20 hover:border-cyan-500/40 rounded-lg transition-all duration-300 group"
                data-testid="button-zkp2p"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-cyan-300 mb-2">ZKP2P</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm max-w-md mx-auto">Zero-knowledge peer-to-peer fiat onramp</p>
              </Button>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}