import { Card } from "@/components/ui/card";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
      {children}
    </Card>
  );
}