import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ExternalLink } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20 ${className}`}>
    {children}
  </Card>
);

export default function BittensorDashboardSection() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center">
          <Brain className="w-6 h-6 mr-3 text-orange-400" />
          Bittensor Dashboard
        </h2>
        <p className="text-crypto-silver">Comprehensive Bittensor subnet analytics and live data</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Top Subnet Movers - TaoStats Integration */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              Top Subnet Movers
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                τ TaoStats
              </Badge>
              <a 
                href="https://taostats.io/subnets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
          
          <div className="relative w-full">
            <iframe
              src="https://taostats.io/subnets"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="TaoStats Subnet Movers"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Live Bittensor Subnet Data
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}