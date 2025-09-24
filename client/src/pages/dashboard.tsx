import { useState, Suspense, useEffect } from "react";
import CryptoDashboardSection from "@/components/crypto-dashboard-section";
import PortfolioSection from "@/components/portfolio-section";
import AlphaSection from "@/components/alpha-section";
import BittensorDashboardSection from "@/components/bittensor-dashboard-section";
import BaseSection from "@/components/base-section";
import SolanaSection from "@/components/solana-section";
import AbstractSection from "@/components/abstract-section";
import DeFiSection from "@/components/defi-section";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import cryptoHippoWithBitcoin from "@assets/image_1758740882958.png";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import { SectionLoadingState } from "@/components/loading-screen";
import { useScrollFade } from "@/hooks/useScrollFade";

type TabType = "dashboard" | "alpha" | "base" | "bittensor" | "abstract" | "solana" | "defi" | "portfolio";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const headerOpacity = useScrollFade(30, 120);

  // Handle URL fragments on page load and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the #
      if (hash && ["alpha", "base", "bittensor", "abstract", "solana", "defi", "portfolio"].includes(hash)) {
        setActiveTab(hash as TabType);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setActiveTab("dashboard");
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header 
        className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300 relative overflow-hidden" 
        style={{ opacity: headerOpacity }}
      >
        {/* Background Image - Expanded */}
        <div 
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage: `url(${newHeaderBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: 'scale(1.1)'
          }}
        />
        {/* Content Layer */}
        <div className="relative z-10 max-w-[95vw] mx-auto px-2 sm:px-3 py-8 lg:py-12">
          <div className="flex justify-between items-center">
            {/* Left side - spacer */}
            <div className="flex-1"></div>
            
            {/* Center - Crypto Hippo with Bitcoin Goggles and Text */}
            <div className="flex flex-col items-center text-center space-y-4">
              <img 
                src={cryptoHippoWithBitcoin}
                alt="Crypto Hippo with Bitcoin Goggles"
                className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 object-contain drop-shadow-lg"
              />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white drop-shadow-lg mb-2">
                  Crypto Market Overview
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-crypto-silver drop-shadow-md">
                  Global market metrics and key indicators
                </p>
              </div>
            </div>
            
            {/* Right side - Crypto coins image */}
            <div className="flex-1 hidden sm:flex justify-end items-center">
              <img 
                src={criptomonedas}
                alt="Crypto Coins"
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 object-contain drop-shadow-lg"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 mt-4 pb-8">
        <Suspense fallback={<SectionLoadingState title="Market Overview" />}>
          {activeTab === "dashboard" && <CryptoDashboardSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Portfolio" />}>
          {activeTab === "portfolio" && <PortfolioSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Alpha Analytics" />}>
          {activeTab === "alpha" && <AlphaSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Base Network" />}>
          {activeTab === "base" && <BaseSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Solana Network" />}>
          {activeTab === "solana" && <SolanaSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Bittensor" />}>
          {activeTab === "bittensor" && <BittensorDashboardSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Abstract Network" />}>
          {activeTab === "abstract" && <AbstractSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="DeFi Platforms" />}>
          {activeTab === "defi" && <DeFiSection />}
        </Suspense>
      </div>
    </div>
  );
}