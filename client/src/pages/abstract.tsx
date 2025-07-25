import { Suspense } from "react";
import { UniversalNavigation } from "@/components/universal-navigation";
import AbstractSection from "@/components/abstract-section";
import { Loader2 } from "lucide-react";

export default function AbstractPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5"></div>
      </div>
      
      <div className="relative z-10">
        <UniversalNavigation />
        
        <main className="container mx-auto px-4 pt-24 pb-12">
          <Suspense 
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                <span className="ml-3 text-lg text-white">Loading Abstract Network...</span>
              </div>
            }
          >
            <AbstractSection />
          </Suspense>
        </main>
      </div>
    </div>
  );
}