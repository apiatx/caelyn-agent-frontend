import { UniversalNavigation } from "@/components/universal-navigation";

export default function TestOnchainPage() {
  return (
    <div className="min-h-screen bg-crypto-dark text-white">
      <UniversalNavigation activePage="onchain" />
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-8 rounded-xl border border-cyan-500/20">
          <h1 className="text-3xl font-bold text-white mb-4">🎯 ONCHAIN PAGE WORKING!</h1>
          <p className="text-lg text-cyan-400">
            This is a test to verify the Onchain page routing is working correctly.
          </p>
          <p className="text-crypto-silver mt-2">
            If you can see this, the routing to /app/onchain is working properly.
          </p>
        </div>
      </div>
    </div>
  );
}