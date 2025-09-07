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
import galaxyStarryBackground from "@assets/pngtree-atmosphere-real-galaxy-starry-banner-background-image_520258_1757207447390.jpg";
import { UniversalNavigation } from "@/components/universal-navigation";
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
        {/* Background Image */}
        <div 
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage: `url(${galaxyStarryBackground})`,
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
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage={activeTab} />

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