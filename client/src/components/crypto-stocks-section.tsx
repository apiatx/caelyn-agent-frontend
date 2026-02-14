import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ExternalLink } from "lucide-react";
import stonksIcon from "@assets/download (2)_1757104529784.jpeg";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function CryptoStocksSection() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 lg:space-y-8">
      <div className="text-center relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 blur-3xl -z-10"></div>
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-2xl hover:scale-110 transition-transform duration-300">
            <img 
              src={stonksIcon} 
              alt="Stonks Icon" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-green-100 to-emerald-100 bg-clip-text text-transparent">Stocks</h1>
            <Badge className="bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-white border-green-400/50 text-sm mt-2 px-3 py-1">
              MARKET ANALYSIS
            </Badge>
          </div>
        </div>
        <p className="text-lg text-white/80 font-medium tracking-wide">AI-powered financial analysis and market intelligence</p>
        <div className="w-32 h-1 bg-gradient-to-r from-green-500 to-emerald-500 mx-auto mt-4 rounded-full"></div>
      </div>

      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Screening</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              STOCK SCREENERS
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <button
            onClick={() => openInNewTab('https://app.koyfin.com/home')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Koyfin</div>
            <div className="text-xs text-crypto-silver">Professional market data and analytics</div>
          </button>

          <button
            onClick={() => openInNewTab('https://www.ainvest.com/screener/')}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">AInvest</div>
            <div className="text-xs text-crypto-silver">AI-powered stock screening and analysis</div>
          </button>

          <button
            onClick={() => openInNewTab('https://www.thenew.money/')}
            className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20 border border-emerald-500/20 hover:border-emerald-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-emerald-300 mb-1">TheNew.Money</div>
            <div className="text-xs text-crypto-silver">Financial market intelligence and analysis</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://stockanalysis.com/trending/')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">StockAnalysis.com</div>
            <div className="text-xs text-crypto-silver">Trending stocks and market analysis</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://finance.yahoo.com/markets/stocks/most-active/')}
            className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border border-yellow-500/20 hover:border-yellow-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-yellow-300 mb-1">Yahoo Finance Most Active</div>
            <div className="text-xs text-crypto-silver">Most actively traded stocks</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://unusualwhales.com/stock-screener')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Unusual Whales</div>
            <div className="text-xs text-crypto-silver">Whale activity and stock screening</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://www.perplexity.ai/finance')}
            className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 hover:from-cyan-500/20 hover:to-cyan-600/20 border border-cyan-500/20 hover:border-cyan-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-cyan-300 mb-1">Perplexity AI Finance</div>
            <div className="text-xs text-crypto-silver">AI-powered financial research and insights</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://stocktwits.com/')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">StockTwits</div>
            <div className="text-xs text-crypto-silver">Social trading platform</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://finviz.com/')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Finviz</div>
            <div className="text-xs text-crypto-silver">Stock screener and market visualization</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://tradytics.com/overall-market')}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">Tradytics</div>
            <div className="text-xs text-crypto-silver">Overall market analysis and trends</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://app.intellectia.ai/stock-market')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Intellectia AI</div>
            <div className="text-xs text-crypto-silver">AI-powered stock market analytics</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://fintel.io/s/us')}
            className="bg-gradient-to-br from-indigo-500/10 to-blue-600/10 hover:from-indigo-500/20 hover:to-blue-600/20 border border-indigo-500/20 hover:border-indigo-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-indigo-300 mb-1">Fintel</div>
            <div className="text-xs text-crypto-silver">Institutional ownership data</div>
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Banterbubbles</h3>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">STOCK BUBBLES</Badge>
          </div>
          <button onClick={() => openInNewTab('https://banterbubbles.com/?utm_source=cbanter&utm_medium=cbanter&utm_campaign=cbanter&source=cbanter#stocks')} className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Open Full View
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://banterbubbles.com/?utm_source=cbanter&utm_medium=cbanter&utm_campaign=cbanter&source=cbanter#stocks"
            className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
            title="Banterbubbles Stock Analysis"
            frameBorder="0"
            loading="eager"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
            allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
          />
        </div>
      </GlassCard>

      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">WallStreetZen</h3>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">STOCK SCREENER</Badge>
          </div>
          <button onClick={() => openInNewTab('https://www.wallstreetzen.com/stock-screener/?t=1&p=1&f%5Bsid%5D=1%2C5%2C10%2C11&f%5Bmc%5D=50000000%2C1000000000&s=mc&sd=desc')} className="text-emerald-400 hover:text-emerald-300 text-xs sm:text-sm flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Open Full View
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.wallstreetzen.com/stock-screener/?t=1&p=1&f%5Bsid%5D=1%2C5%2C10%2C11&f%5Bmc%5D=50000000%2C1000000000&s=mc&sd=desc"
            className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
            title="WallStreetZen Stock Screener"
            frameBorder="0"
            loading="eager"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
            allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
          />
        </div>
      </GlassCard>

      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Fiscal.ai</h3>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">AI ANALYTICS</Badge>
          </div>
          <button onClick={() => openInNewTab('https://fiscal.ai/dashboard/7b99775e-bf9c-4b18-85a8-7a62cd29a52b/')} className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Open Full View
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://fiscal.ai/dashboard/7b99775e-bf9c-4b18-85a8-7a62cd29a52b/"
            className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
            title="Fiscal.ai Dashboard"
            frameBorder="0"
            loading="eager"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
            allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
          />
        </div>
      </GlassCard>

    </div>
  );
}
