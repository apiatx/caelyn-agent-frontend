import { UniversalNavigation } from "@/components/universal-navigation";
import AlphaSection from "@/components/alpha-section";

export default function OnchainPage() {
  return (
    <div className="min-h-screen bg-crypto-dark text-white">
      <UniversalNavigation activePage="onchain" />
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <AlphaSection />
      </div>
    </div>
  );
}