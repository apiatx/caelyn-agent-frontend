import { UniversalNavigation } from "@/components/universal-navigation";
import WhaleWatchingSection from "@/components/whale-watching-section";

export default function OnchainPage() {
  return (
    <div className="min-h-screen bg-crypto-dark text-white">
      <UniversalNavigation activePage="onchain" />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6">
        <WhaleWatchingSection />
      </div>
    </div>
  );
}