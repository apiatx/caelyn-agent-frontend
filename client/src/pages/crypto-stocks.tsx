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

      {/* Perplexity Finance Access */}
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 mt-4">
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Perplexity Finance</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">AI-Powered Financial Analysis</h3>
              <p className="text-gray-300 text-sm">Get real-time insights on markets, stocks, and crypto with advanced AI analysis.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Real-Time Market Data</h3>
              <p className="text-gray-300 text-sm">Access live financial data, news, and market trends powered by Perplexity AI.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://www.perplexity.ai/finance"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 text-center flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Perplexity Finance
            </a>
            <a
              href="https://www.perplexity.ai/search?q=latest+financial+market+news"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 text-center flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Market News
            </a>
          </div>
        </div>
      </div>

      {/* Tradytics Charts */}
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3">
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Tradytics Charts</h2>
            </div>
            <a
              href="https://tradytics.com/charts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Open in New Tab ↗
            </a>
          </div>
          <div className="relative w-full" style={{ height: '700px' }}>
            <iframe
              src="https://tradytics.com/charts"
              className="w-full h-full border-0 rounded-lg bg-black"
              title="Tradytics Charts"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
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