import { UniversalNavigation } from "@/components/universal-navigation";
import BaseSection from "@/components/base-section";

export default function BasePage() {
  return (
    <div className="min-h-screen bg-crypto-dark text-white">
      <UniversalNavigation activePage="base" />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6">
        <BaseSection />
      </div>
    </div>
  );
}