import { Suspense } from "react";
import { EthereumSection } from "@/components/ethereum-section";
import cryptoHippoImage from "@assets/image_1753204691716.png";
import { UniversalNavigation } from "@/components/universal-navigation";
import { SectionLoadingState } from "@/components/loading-screen";

export default function EthereumPage() {
  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50">
        <div className="max-w-[95vw] mx-auto px-2 sm:px-3">
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
      <UniversalNavigation activePage="ethereum" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-8">
          {/* Ethereum Section */}
          <Suspense fallback={<SectionLoadingState title="Ethereum Network" />}>
            <EthereumSection />
          </Suspense>
        </div>
      </main>
    </div>
  );
}