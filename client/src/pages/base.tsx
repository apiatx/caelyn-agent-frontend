import { UniversalNavigation } from "@/components/universal-navigation";
import BaseSection from "@/components/base-section";

export default function BasePage() {
  return (
    <div className="min-h-screen bg-crypto-dark text-white">
      <UniversalNavigation activePage="base" />
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <BaseSection />
      </div>
    </div>
  );
}