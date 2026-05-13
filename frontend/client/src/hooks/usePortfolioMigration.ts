import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function usePortfolioMigration() {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
    if (!token) return;

    (async () => {
      const log: Record<string, any> = {
        stockHoldingsCount: 0,
        stockHoldingsSymbols: [],
        backendCanonicalCount: 0,
        backendCanonicalSymbols: [],
        shouldMigrate: false,
        migrationAttempted: false,
        migrationStatus: 'not_attempted',
        postStatus: null,
        postResponse: null,
        afterMigrationBackendCount: null,
        afterMigrationBackendSymbols: null,
      };

      try {
        const [localRes, canonicalRes] = await Promise.all([
          fetch('/api/stock-holdings'),
          fetch('/api/portfolio/holdings', {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ]);

        const localHoldings: any[] = localRes.ok ? await localRes.json() : [];
        const canonicalRaw = canonicalRes.ok ? await canonicalRes.json() : null;
        const canonicalHoldings: any[] = Array.isArray(canonicalRaw)
          ? canonicalRaw
          : Array.isArray(canonicalRaw?.holdings)
            ? canonicalRaw.holdings
            : [];

        const localSymbols     = localHoldings.map(h => (h.ticker || h.symbol || '').toUpperCase()).sort();
        const canonicalSymbols = canonicalHoldings.map(h => (h.ticker || h.symbol || '').toUpperCase()).sort();

        log.stockHoldingsCount      = localHoldings.length;
        log.stockHoldingsSymbols    = localSymbols;
        log.backendCanonicalCount   = canonicalHoldings.length;
        log.backendCanonicalSymbols = canonicalSymbols;

        // Safety: never overwrite backend with empty local
        if (localHoldings.length === 0) {
          log.migrationStatus = 'skipped_local_empty';
          console.log('[portfolio-sync-truth]', JSON.stringify(log));
          return;
        }

        // Migrate whenever local has more holdings than backend canonical
        // No localStorage guard — guard is the actual count comparison
        const shouldMigrate = localHoldings.length > canonicalHoldings.length;
        log.shouldMigrate = shouldMigrate;

        if (!shouldMigrate) {
          log.migrationStatus = 'in_sync';
          console.log('[portfolio-sync-truth]', JSON.stringify(log));
          return;
        }

        // Run migration — pass force=true so FastAPI doesn't block on its own count guard
        log.migrationAttempted = true;
        console.log(`[portfolio-sync] local=${localHoldings.length} > canonical=${canonicalHoldings.length} — migrating now`);

        const migrateRes = await fetch('/api/portfolio/holdings/migrate-from-client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            holdings: localHoldings,
            source: 'frontend_dashboard_auto_sync',
            force: true,
          }),
        });

        log.postStatus = migrateRes.status;

        if (migrateRes.ok) {
          const migrateResult = await migrateRes.json();
          log.postResponse = migrateResult;

          if (migrateResult?.success) {
            log.migrationStatus = 'success';

            // Verify backend canonical now matches
            try {
              const verifyRes = await fetch('/api/portfolio/holdings', {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (verifyRes.ok) {
                const verifyRaw = await verifyRes.json();
                const verifyHoldings: any[] = Array.isArray(verifyRaw)
                  ? verifyRaw
                  : Array.isArray(verifyRaw?.holdings) ? verifyRaw.holdings : [];
                log.afterMigrationBackendCount   = verifyHoldings.length;
                log.afterMigrationBackendSymbols = verifyHoldings.map(h => (h.ticker || h.symbol || '').toUpperCase()).sort();
              }
            } catch { /* non-fatal verification step */ }

            queryClient.invalidateQueries({ queryKey: ['portfolio-holdings'] });
            queryClient.invalidateQueries({ queryKey: ['stock-holdings'] });
            queryClient.invalidateQueries({ queryKey: ['caelyn-terminal'] });
          } else {
            log.migrationStatus = 'failed_fastapi_rejected';
            console.warn('[portfolio-sync] FastAPI rejected migration:', migrateResult);
          }
        } else {
          const errText = await migrateRes.text();
          log.postResponse = errText;
          log.migrationStatus = 'failed_http_' + migrateRes.status;
          console.warn('[portfolio-sync] Migration endpoint returned', migrateRes.status, errText);
        }
      } catch (err) {
        log.migrationStatus = 'error';
        log.postResponse = String(err);
        console.warn('[portfolio-sync] Error during migration check:', err);
      }

      console.log('[portfolio-sync-truth]', JSON.stringify(log));
    })();
  }, [queryClient]);
}
