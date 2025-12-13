import { Card } from "@/components/ui/card";
import { ExternalLink, Layers } from "lucide-react";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import { LazyIframe } from "@/components/lazy-iframe";

const SafeLink = ({ href, children, className = "", ...props }: { 
  href: string; 
  children: React.ReactNode; 
  className?: string; 
  [key: string]: any; 
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={className}
    onClick={(e) => {
      e.preventDefault();
      openSecureLink(href);
    }}
    {...props}
  >
    {children}
  </a>
);

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function ArbitrumContent() {
  return (
    <div className="space-y-8">
      {/* Arbitrum Glass Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Layers className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Arbitrum</h3>
            <p className="text-crypto-silver">Arbitrum ecosystem portal</p>
          </div>
        </div>

        <div className="flex justify-end mb-3">
          <SafeLink
            href="https://portal.arbitrum.io/"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </SafeLink>
        </div>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden h-[700px]">
          <LazyIframe
            src="https://portal.arbitrum.io/"
            title="Arbitrum Ecosystem Portal"
            className="w-full h-full"
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Arbitrum Ecosystem Portal • Explore the Arbitrum ecosystem
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
