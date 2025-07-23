import { Suspense } from "react";
import { Building2 } from "lucide-react";
import CryptoStocksSection from "@/components/crypto-stocks-section";
import cryptoHippoImage from "@assets/image_1753204691716.png";
import { LoadingScreen, SectionLoadingState } from "@/components/loading-screen";

export default function CryptoStocks() {
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 lg:py-8">
        <div className="space-y-4 lg:space-y-8">
          {/* Page Title */}
          <div className="text-center px-3 sm:px-0">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Crypto Stocks</h2>
            </div>
            <p className="text-sm sm:text-base text-crypto-silver">Corporate treasury holdings and institutional crypto adoption</p>
          </div>

          {/* Crypto Stocks Content */}
          <Suspense fallback={<SectionLoadingState />}>
            <CryptoStocksSection />
          </Suspense>
        </div>
      </main>
    </div>
  );
}