import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const MIGRATION_FLAG_KEY = 'portfolio_migrated_v2';

export function usePortfolioMigration() {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
    if (!token) return;

    (async () => {
      try {
        const alreadyMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';

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

        const localSymbols    = localHoldings.map(h => h.ticker).sort();
        const canonicalSymbols = canonicalHoldings.map(h => (h.ticker || h.symbol || '').toUpperCase()).sort();
        const migrationNeeded = localHoldings.length > canonicalHoldings.length && !alreadyMigrated;

        console.log('[portfolio-frontend-source]', JSON.stringify({
          dashboardVisibleSymbols: localSymbols,
          dashboardVisibleCount:   localHoldings.length,
          localStorageSymbols:     [],
          backendCanonicalSymbols: canonicalSymbols,
          backendCanonicalCount:   canonicalHoldings.length,
          source: '/api/stock-holdings → frontend/data/stock-holdings.json',
          migrationNeeded,
          alreadyMigrated,
        }));

        if (!migrationNeeded) {
          if (!alreadyMigrated && canonicalHoldings.length >= localHoldings.length && canonicalHoldings.length > 0) {
            localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
            console.log('[portfolio-migration] Backend already canonical — setting guard.');
          }
          return;
        }

        if (localHoldings.length === 0) {
          console.log('[portfolio-migration] Local holdings empty — skipping migration to avoid wipe.');
          return;
        }

        console.log(`[portfolio-migration] Migrating ${localHoldings.length} local holdings → canonical backend…`);

        const migrateRes = await fetch('/api/portfolio/holdings/migrate-from-client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            holdings: localHoldings,
            source: 'frontend_dashboard_existing_state',
          }),
        });

        if (migrateRes.ok) {
          const result = await migrateRes.json();
          console.log('[portfolio-migration] Complete:', result);
          localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
          queryClient.invalidateQueries({ queryKey: ['portfolio-holdings'] });
          queryClient.invalidateQueries({ queryKey: ['stock-holdings'] });
          queryClient.invalidateQueries({ queryKey: ['caelyn-terminal'] });
        } else {
          console.warn('[portfolio-migration] Endpoint returned', migrateRes.status, '— will retry next session.');
        }
      } catch (err) {
        console.warn('[portfolio-migration] Error during migration check:', err);
      }
    })();
  }, [queryClient]);
}
