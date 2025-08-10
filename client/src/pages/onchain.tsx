import { UniversalNavigation } from "@/components/universal-navigation";
import AlphaSection from "@/components/alpha-section";

export default function OnchainPage() {
  return (
    <div className="min-h-screen bg-crypto-dark text-white">
      <UniversalNavigation activePage="onchain" />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6">
        <AlphaSection />
      </div>
    </div>
  );
}