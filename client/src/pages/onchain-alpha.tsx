import { UniversalNavigation } from "@/components/universal-navigation";
import AlphaSection from "@/components/alpha-section";

export default function OnchainAlphaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <UniversalNavigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AlphaSection />
      </main>
    </div>
  );
}