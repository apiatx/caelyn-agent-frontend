import DeFiSection from "@/components/defi-section";
import cryptoHippoImage from "@assets/cute-cartoon-hippo-showing-off-butt-vector_1756060620427.jpg";
import { UniversalNavigation } from "@/components/universal-navigation";
import { useScrollFade } from "@/hooks/useScrollFade";

export default function DeFiPage() {
  const headerOpacity = useScrollFade(30, 120);

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300" style={{ opacity: headerOpacity }}>
        <div className="max-w-[95vw] mx-auto px-2 sm:px-3">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white">
                CryptoHippo
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="defi" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <DeFiSection />
      </main>
    </div>
  );
}