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
        
        <div className="rounded-xl overflow-hidden border border-crypto-silver/20">
          <iframe
            src="https://cointelegraph.com/category/latest-news"
            className="w-full h-[600px] bg-white"
            title="Cointelegraph Latest News"
          />
        </div>
      </GlassCard>
    </div>
  );
}