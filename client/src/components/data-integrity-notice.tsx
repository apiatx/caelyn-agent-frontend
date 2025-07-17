import { AlertTriangle, ExternalLink } from "lucide-react";

export function DataIntegrityNotice() {
  return (
    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-orange-900 dark:text-orange-100">
            Authentic Data Required
          </h3>
          <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
            To display your real crypto holdings, a valid API key is required for blockchain data access. 
            Without proper credentials, no portfolio data will be shown to maintain data integrity.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <a 
              href="https://basescan.org/apis" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
            >
              Get Basescan API Key <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}