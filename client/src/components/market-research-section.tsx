import { ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export default function MarketResearchSection() {
  return (
    <div className="space-y-8">
      {/* Cointelegraph Latest News */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-white">Crypto News</h2>
            <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-lg font-medium">
              COINTELEGRAPH
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('https://cointelegraph.com/category/latest-news', '_blank')}
            className="text-crypto-silver hover:text-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Full View
          </Button>
        </div>
        
        <div className="rounded-xl overflow-hidden border border-crypto-silver/20 bg-gradient-to-br from-blue-500/10 to-purple-600/10 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <ExternalLink className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Latest Crypto News
            </h3>
            <p className="text-crypto-silver mb-6 max-w-md">
              Access the latest cryptocurrency news, market analysis, and blockchain insights from Cointelegraph's comprehensive coverage.
            </p>
            <Button
              onClick={() => window.open('https://cointelegraph.com/category/latest-news', '_blank')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Read Latest News
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}