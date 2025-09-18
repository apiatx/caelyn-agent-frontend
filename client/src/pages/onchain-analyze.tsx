import { UniversalNavigation } from "@/components/universal-navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ExternalLink } from "lucide-react";
import { openSecureLink } from '@/utils/security';
import analyzeImage from "@assets/download (4)_1757214892954.png";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import { useScrollFade } from "@/hooks/useScrollFade";

// Safe Glass Card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-black/90 to-black/95 border border-white/20 ${className}`}>
    {children}
  </Card>
);

export default function OnchainAnalyzePage() {
  const headerOpacity = useScrollFade(30, 120);
  
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

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
      <UniversalNavigation activePage="onchain-analyze" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-8">
          {/* Analyze Section - Enhanced Header */}
          <div className="text-center relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-teal-500/20 blur-3xl -z-10"></div>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img 
                  src={analyzeImage} 
                  alt="Analyze" 
                  className="w-28 h-28 object-cover"
                />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent">Analyze</h2>
            </div>
            <p className="text-lg text-white/80 font-medium tracking-wide">AI-powered blockchain analytics and insights</p>
            <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Main Analysis Tools */}
          <GlassCard className="p-6">
            {/* SAG3.ai Analysis */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">SAG3.ai</h3>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                  AI ANALYSIS
                </Badge>
                <button
                  onClick={() => openInNewTab('https://sag3.ai/analyze')}
                  className="ml-auto text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm flex items-center gap-1"
                  data-testid="button-sag3-external"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Full View
                </button>
              </div>
              <iframe
                src="https://sag3.ai/analyze"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                title="SAG3.ai Analysis"
                frameBorder="0"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                referrerPolicy="no-referrer-when-downgrade"
                data-testid="iframe-sag3"
              />
            </div>
            
            {/* Artemis Analytics */}
            <div className="mb-8 relative">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">Artemis Analytics</h3>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      PROTOCOL METRICS
                    </Badge>
                  </div>
                  <button
                    onClick={() => openInNewTab('https://app.artemisanalytics.com/')}
                    className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-blue-400/30 hover:bg-blue-500/20 transition-all duration-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Full View
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="w-full">
                  <iframe
                    src="https://app.artemisanalytics.com/"
                    title="Artemis Analytics Dashboard"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    frameBorder="0"
                    loading="lazy"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{
                      background: '#000000',
                      colorScheme: 'dark'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Token Terminal - Full width row */}
            <div className="mb-6">
              <button
                onClick={() => openInNewTab('https://tokenterminal.com/explorer')}
                className="w-full bg-gradient-to-br from-purple-500/15 to-purple-600/15 hover:from-purple-500/25 hover:to-purple-600/25 border border-purple-500/30 hover:border-purple-400/50 rounded-xl p-5 transition-all duration-300 text-center group shadow-lg hover:shadow-purple-500/20 hover:scale-105 transform"
                data-testid="button-token-terminal"
              >
                <div className="text-base font-semibold text-white group-hover:text-purple-200 mb-2 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full group-hover:animate-pulse"></div>
                  Token Terminal
                </div>
                <div className="text-sm text-gray-300 group-hover:text-gray-200">Protocol metrics explorer</div>
              </button>
            </div>

            {/* Developer Report, The Block, and Chainspect - 3 across */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => openInNewTab('https://www.developerreport.com/')}
                className="bg-gradient-to-br from-green-500/15 to-green-600/15 hover:from-green-500/25 hover:to-green-600/25 border border-green-500/30 hover:border-green-400/50 rounded-xl p-5 transition-all duration-300 text-center group shadow-lg hover:shadow-green-500/20 hover:scale-105 transform"
                data-testid="button-developer-report"
              >
                <div className="text-base font-semibold text-white group-hover:text-green-200 mb-2 flex flex-col items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full group-hover:animate-pulse"></div>
                  Developer Report
                </div>
                <div className="text-sm text-gray-300 group-hover:text-gray-200 text-center">Developer activity by blockchain</div>
              </button>

              <button
                onClick={() => openInNewTab('https://www.theblock.co/data/decentralized-finance/dex-non-custodial')}
                className="bg-gradient-to-br from-orange-500/15 to-orange-600/15 hover:from-orange-500/25 hover:to-orange-600/25 border border-orange-500/30 hover:border-orange-400/50 rounded-xl p-5 transition-all duration-300 text-center group shadow-lg hover:shadow-orange-500/20 hover:scale-105 transform"
                data-testid="button-the-block"
              >
                <div className="text-base font-semibold text-white group-hover:text-orange-200 mb-2 flex flex-col items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full group-hover:animate-pulse"></div>
                  The Block: DEX Metrics
                </div>
                <div className="text-sm text-gray-300 group-hover:text-gray-200 text-center">Comprehensive DEX analytics and metrics</div>
              </button>

              <button
                onClick={() => openInNewTab('https://chainspect.app/dashboard')}
                className="bg-gradient-to-br from-cyan-500/15 to-cyan-600/15 hover:from-cyan-500/25 hover:to-cyan-600/25 border border-cyan-500/30 hover:border-cyan-400/50 rounded-xl p-5 transition-all duration-300 text-center group shadow-lg hover:shadow-cyan-500/20 hover:scale-105 transform"
                data-testid="button-chainspect"
              >
                <div className="text-base font-semibold text-white group-hover:text-cyan-200 mb-2 flex flex-col items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full group-hover:animate-pulse"></div>
                  Chainspect
                </div>
                <div className="text-sm text-gray-300 group-hover:text-gray-200 text-center">Chain scalability and decentralization analytics</div>
              </button>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}