import { useSetPageContext } from "@/hooks/useSetPageContext";
import { StockCompareSection } from "@/components/stock-compare-section";

export default function StocksFundamentalsPage() {
  useSetPageContext('[Page: Fundamentals]\nDisplays stock fundamental analysis tools: a side-by-side stock comparison tool. Ask about P/E ratios, revenue growth, earnings beats, debt levels, free cash flow, or comparative valuation between any stocks.', []);

  return (
    <div className="min-h-screen text-white" style={{ background: '#020202' }}>
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <StockCompareSection />
      </main>
    </div>
  );
}
