import { UniversalNavigation } from "@/components/universal-navigation";
import PortfolioSection from "@/components/portfolio-section";

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-crypto-dark text-white">
      <UniversalNavigation activePage="portfolio" />
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <PortfolioSection />
      </div>
    </div>
  );
}