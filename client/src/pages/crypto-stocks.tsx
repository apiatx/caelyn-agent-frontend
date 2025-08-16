import CryptoStocksSection from "@/components/crypto-stocks-section";
import { UniversalNavigation } from "@/components/universal-navigation";
import cryptoHippoImage from "@assets/image_1753204691716.png";
import { useScrollFade } from "@/hooks/useScrollFade";

export default function CryptoStocksPage() {
  const headerOpacity = useScrollFade(30, 120);

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300" style={{ opacity: headerOpacity }}>
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
      <UniversalNavigation activePage="crypto-stocks" />

      {/* Perplexity Finance */}
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 mt-4">
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Perplexity Finance</h2>
            <a
              href="https://www.perplexity.ai/finance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Open in New Tab ↗
            </a>
          </div>
          <div className="relative w-full" style={{ height: '600px' }}>
            <iframe
              src="https://www.perplexity.ai/finance"
              className="w-full h-full border-0 rounded-lg"
              title="Perplexity Finance"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 pb-8">
        <CryptoStocksSection />
      </div>
    </div>
  );
}