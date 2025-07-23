import { useState, Suspense, useEffect } from "react";
import CryptoDashboardSection from "@/components/crypto-dashboard-section";
import PortfolioSection from "@/components/portfolio-section";
import AlphaSection from "@/components/alpha-section";
import BittensorDashboardSection from "@/components/bittensor-dashboard-section";
import BaseSectionSafe from "@/components/base-section-safe";
import SolanaSection from "@/components/solana-section";
import AbstractSection from "@/components/abstract-section";
import DeFiSection from "@/components/defi-section";
import cryptoHippoImage from "@assets/image_1753204691716.png";
import { UniversalNavigation } from "@/components/universal-navigation";
import { SectionLoadingState } from "@/components/loading-screen";

type TabType = "dashboard" | "alpha" | "base" | "bittensor" | "abstract" | "solana" | "defi" | "portfolio";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

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
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                CryptoHippo
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="dashboard" />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 mt-4 lg:mt-8 pb-8">
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
          {activeTab === "base" && <BaseSectionSafe />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Bittensor" />}>
          {activeTab === "bittensor" && <BittensorDashboardSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Abstract Network" />}>
          {activeTab === "abstract" && <AbstractSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Solana Network" />}>
          {activeTab === "solana" && <SolanaSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="DeFi Platforms" />}>
          {activeTab === "defi" && <DeFiSection />}
        </Suspense>
      </div>
    </div>
  );
}