import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/card';
import { BarChart3, ExternalLink, TrendingUp, Link2 } from 'lucide-react';

interface SafeLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const SafeLink: React.FC<SafeLinkProps> = ({ href, children, className = "" }) => {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button onClick={() => openInNewTab(href)} className={className}>
      {children}
    </button>
  );
};

export default function AlphaSection() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <Link2 className="w-8 h-8 text-yellow-400" style={{filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.3))'}} />
          </div>
          <h1 className="text-3xl font-bold text-white">Onchain Analytics</h1>
        </div>
        <p className="text-crypto-silver">Comprehensive blockchain data and intelligence</p>
      </div>

      {/* All analytics sections */}
      <div className="space-y-8">
        {/* Onchain - Artemis Analytics */}
        <GlassCard className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Artemis</h3>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                COMPREHENSIVE
              </Badge>
            </div>
            <button
              onClick={() => openInNewTab('https://app.artemisanalytics.com/')}
              className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm"
            >
              Open Full View →
            </button>
          </div>

          {/* Artemis Analytics Iframe */}
          <div className="mb-6">
            <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 overflow-hidden">
              <iframe
                src="https://app.artemisanalytics.com/"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px]"
                title="Artemis Analytics Dashboard"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                referrerPolicy="no-referrer-when-downgrade"
                loading="lazy"
                allow="fullscreen; web-share; clipboard-read; clipboard-write; camera; microphone"
                style={{ border: 'none' }}
              />
            </div>
          </div>

          {/* Other Analytics Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SafeLink
              href='https://ayaoracle.xyz/#agents_data'
              className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-indigo-400 font-semibold">Aya AI</h4>
              </div>
              <p className="text-gray-400 text-sm">Crypto AI Agent Analytics</p>
            </SafeLink>

            <SafeLink
              href='https://opensea.io/stats/tokens'
              className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-blue-400 font-semibold">OpenSea</h4>
              </div>
              <p className="text-gray-400 text-sm">Trending Altcoin Timeframes</p>
            </SafeLink>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}